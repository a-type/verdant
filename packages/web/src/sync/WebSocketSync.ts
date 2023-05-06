import {
	ClientMessage,
	ServerMessage,
	EventSubscriber,
	ObjectIdentifier,
	assert,
	ReplicaType,
} from '@verdant/common';
import { default as jwtDecode } from 'jwt-decode';
import { Backoff, BackoffScheduler } from '../BackoffScheduler.js';
import { EntityStore } from '../reactives/EntityStore.js';
import { Metadata } from '../metadata/Metadata.js';
import { PresenceManager } from './PresenceManager.js';
import { SyncTransport, SyncTransportEvents } from './Sync.js';
import { Heartbeat } from './Heartbeat.js';
import { ServerSyncEndpointProvider } from './ServerSyncEndpointProvider.js';

export class WebSocketSync
	extends EventSubscriber<SyncTransportEvents>
	implements SyncTransport
{
	private meta: Metadata;
	readonly presence: PresenceManager;
	private socket: WebSocket | null = null;
	// messages awaiting websocket connection to send
	private connectQueue: ClientMessage[] = [];
	// messages awaiting sync response to send
	private syncQueue: ClientMessage[] = [];
	private endpointProvider;
	private _status: 'active' | 'paused' = 'paused';
	private synced = false;
	private hasStartedSync = false;

	readonly mode = 'realtime';
	private log = (...args: any[]) => {};

	private heartbeat = new Heartbeat();

	private reconnectScheduler = new BackoffScheduler(
		new Backoff(60 * 1000, 1.5),
	);

	constructor({
		endpointProvider,
		meta,
		presence,
		log,
	}: {
		endpointProvider: ServerSyncEndpointProvider;
		meta: Metadata;
		presence: PresenceManager;
		log?: (...args: any[]) => any;
	}) {
		super();
		this.log = log || this.log;
		this.endpointProvider = endpointProvider;
		this.meta = meta;
		this.presence = presence;

		this.reconnectScheduler.subscribe('trigger', this.initializeSocket);
		this.heartbeat.subscribe('beat', this.sendHeartbeat);
	}

	private onOpen = () => {
		if (!this.socket) {
			throw new Error('Invalid sync state: online but socket is null');
		}
		this.synced = false;
		if (this.connectQueue.length) {
			for (const msg of this.connectQueue) {
				this.log('Sending queued message', JSON.stringify(msg, null, 2));
				this.socket.send(JSON.stringify(msg));
			}
			this.connectQueue = [];
		}
		this.log('Sync connected');
		this.onOnlineChange(true);
		this.reconnectScheduler.reset();
	};

	private onOnlineChange = async (online: boolean) => {
		this.log('Socket online change', online);
		if (!online) {
			this.hasStartedSync = false;
			this.synced = false;
			this.heartbeat.stop();
		} else {
			this.log('Starting sync');
			this.hasStartedSync = true;
			this.synced = false;
			this.send(
				await this.meta.messageCreator.createPresenceUpdate(
					this.presence.self.presence,
				),
			);
			this.send(await this.meta.messageCreator.createSyncStep1());
			this.heartbeat.start();
		}
		this.emit('onlineChange', online);
	};

	private onMessage = async (event: MessageEvent) => {
		const message = JSON.parse(event.data) as ServerMessage;
		switch (message.type) {
			case 'sync-resp':
				if (message.ackThisNonce) {
					// we need to send the ack to confirm we got the response
					this.send(
						await this.meta.messageCreator.createAck(message.ackThisNonce),
					);
				}
				this.hasStartedSync = true;
				this.synced = true;
				if (this.syncQueue.length) {
					for (const msg of this.syncQueue) {
						this.send(msg);
					}
					this.syncQueue = [];
				}
			case 'need-since':
			case 'presence-changed':
			case 'presence-offline':
			case 'op-re':
				this.emit('message', message);
				break;
			case 'heartbeat-response':
				this.heartbeat.keepAlive();
				this.emit('message', message);
				break;
			default:
				if (this.synced) {
					this.emit('message', message);
				}
				break;
		}
	};

	private onError = (event: Event) => {
		this.log(event);
		this.reconnectScheduler.next();

		this.log(`Attempting reconnect to websocket sync`);
	};

	private onClose = (event: CloseEvent) => {
		this.log('Sync disconnected');
		this.onOnlineChange(false);
		this.onError(event);
	};

	private initializeSocket = async () => {
		const endpoint = await this.endpointProvider.getEndpoints();
		// abusing protocols to pass the auth token
		this.socket = new WebSocket(endpoint.websocket, ['Bearer', endpoint.token]);
		this.socket.addEventListener('message', this.onMessage);
		this.socket.addEventListener('open', this.onOpen);
		this.socket.addEventListener('error', this.onError);
		this.socket.addEventListener('close', this.onClose);
		return this.socket;
	};

	private sendHeartbeat = async () => {
		this.send(await this.meta.messageCreator.createHeartbeat());
	};

	reconnect = () => {
		this.stop();
		this.start();
	};

	private canSkipSyncWait = (message: ClientMessage) => {
		return (
			message.type === 'sync' ||
			message.type === 'presence-update' ||
			message.type === 'sync-ack' ||
			message.type === 'heartbeat'
		);
	};

	send = (message: ClientMessage) => {
		if (this.status !== 'active') return;

		// wait until a sync has started before doing anything other than sync.
		// new "op" messages can arrive before sync has started, so we need to wait
		if (!this.hasStartedSync && !this.canSkipSyncWait(message)) {
			return;
		}

		if (this.canSkipSyncWait(message)) {
			if (this.socket?.readyState === WebSocket.OPEN) {
				this.log('Sending message', JSON.stringify(message, null, 2));
				this.socket!.send(JSON.stringify(message));
			} else {
				this.log(
					'Enqueueing message until socket is open',
					JSON.stringify(message, null, 2),
				);
				this.connectQueue.push(message);
			}
		} else if (this.synced) {
			if (this.socket?.readyState === WebSocket.OPEN) {
				this.log('Sending message', JSON.stringify(message, null, 2));
				this.socket.send(JSON.stringify(message));
			}
		} else if (this.hasStartedSync) {
			this.log(
				'Enqueueing message until synced',
				JSON.stringify(message, null, 2),
			);
			this.syncQueue.push(message);
		}
	};

	dispose = () => {
		this.socket?.removeEventListener('close', this.onClose);
		this.socket?.close();
	};

	start = () => {
		if (this.socket) {
			return;
		}
		this.initializeSocket();
		this._status = 'active';
	};

	stop = () => {
		this.dispose();
		this.socket = null;
		this._status = 'paused';
	};

	get isConnected() {
		return this.socket?.readyState === WebSocket.OPEN;
	}

	get status() {
		return this._status;
	}
}
