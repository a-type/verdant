import {
	ClientMessage,
	EventSubscriber,
	ServerMessage,
} from '@verdant-web/common';
import { Backoff, BackoffScheduler } from '../BackoffScheduler.js';
import { Context } from '../context/context.js';
import { Heartbeat } from './Heartbeat.js';
import { PresenceManager } from './PresenceManager.js';
import { ServerSyncEndpointProvider } from './ServerSyncEndpointProvider.js';
import { SyncTransport, SyncTransportEvents } from './Sync.js';

export class WebSocketSync
	extends EventSubscriber<SyncTransportEvents>
	implements SyncTransport
{
	readonly presence: PresenceManager;
	private socket: WebSocket | null = null;
	// messages awaiting websocket connection to send
	private connectQueue: ClientMessage[] = [];
	// messages awaiting sync response to send
	private syncQueue: ClientMessage[] = [];
	// messages waiting for sync to finish
	private incomingQueue: ServerMessage[] = [];
	private endpointProvider;
	private _status: 'active' | 'paused' = 'paused';
	private synced = false;
	private hasStartedSync = false;
	private _ignoreIncoming = false;

	readonly mode = 'realtime';
	private ctx: Context;

	private heartbeat = new Heartbeat({ restartOnTabFocus: false });
	private connectionCheck: ReturnType<typeof setInterval> | null = null;
	private connectionGeneration = 0;
	private connecting = false;

	private reconnectScheduler = new BackoffScheduler(
		new Backoff(2_000, 60_000, 1.5),
	);

	constructor({
		endpointProvider,
		ctx,
		presence,
	}: {
		endpointProvider: ServerSyncEndpointProvider;
		ctx: Context;
		presence: PresenceManager;
	}) {
		super();
		this.ctx = ctx;
		this.endpointProvider = endpointProvider;
		this.presence = presence;

		this.reconnectScheduler.subscribe('trigger', this.initializeSocket);
		this.heartbeat.subscribe('beat', this.sendHeartbeat);
		window.addEventListener('beforeunload', this.sendDisconnectingOnUnload);
	}

	get hasSynced() {
		return this.synced;
	}

	private onOpen = () => {
		if (!this.socket) {
			throw new Error('Invalid sync state: online but socket is null');
		}
		this.reconnectScheduler.reset();
		this.synced = false;
		if (this.connectQueue.length) {
			for (const msg of this.connectQueue) {
				this.ctx.log(
					'debug',
					'Sending queued message',
					JSON.stringify(msg, null, 2),
				);
				this.socket.send(JSON.stringify(msg));
			}
			this.connectQueue = [];
		}
		this.ctx.log('debug', 'Sync connected');
		this.onOnlineChange(true);
	};

	private onOnlineChange = async (online: boolean) => {
		this.ctx.log('info', 'Socket online change', online);
		if (this.disposed) {
			return;
		}
		if (this.ctx.closing) return;
		if (!online) {
			this.hasStartedSync = false;
			this.synced = false;
			this.heartbeat.stop();
		} else {
			const generation = this.connectionGeneration;
			const socket = this.socket;
			this.ctx.log('debug', 'Starting sync');
			this.hasStartedSync = true;
			this.synced = false;
			const meta = await this.ctx.meta;
			const presence = await meta.messageCreator.createPresenceUpdate(
				this.presence.self,
			);
			const sync = await meta.messageCreator.createSyncStep1();
			if (
				generation !== this.connectionGeneration ||
				this.socket !== socket ||
				!this.isConnected
			)
				return;
			this.send(presence);
			this.send(sync);
			this.heartbeat.start();
		}
		this.emit('onlineChange', online);
	};

	private onMessage = async (event: MessageEvent) => {
		this.reconnectScheduler.reset();
		if (this._ignoreIncoming) {
			this.ctx.log(
				'warn',
				'Ignoring incoming message (ignore incoming flag set)',
				event.data,
			);
			return;
		}

		const message = JSON.parse(event.data) as ServerMessage;
		this.ctx.log('debug', 'Received', message.type, 'message');
		switch (message.type) {
			case 'sync-resp':
				if (message.ackThisNonce) {
					// we need to send the ack to confirm we got the response
					this.send(
						await (
							await this.ctx.meta
						).messageCreator.createAck(message.ackThisNonce),
					);
				}
				this.hasStartedSync = true;
				this.synced = true;
				if (this.syncQueue.length) {
					if (message.overwriteLocalData) {
						this.ctx.log(
							'warn',
							'Overwriting local data - dropping outgoing message queue',
						);
						this.syncQueue = [];
					} else {
						for (const msg of this.syncQueue) {
							this.send(msg);
						}
						this.syncQueue = [];
					}
				}
				this.emit('message', message);
				if (this.incomingQueue.length) {
					for (const msg of this.incomingQueue) {
						this.emit('message', msg);
					}
					this.incomingQueue = [];
				}
				break;
			case 'need-since':
			case 'presence-changed':
			case 'presence-offline':
				this.emit('message', message);
				break;
			case 'op-re':
				if (!this.synced) {
					this.ctx.log(
						'debug',
						`Enqueueing op-re message because sync hasn't finished yet`,
						message,
					);
					this.incomingQueue.push(message);
					break;
				}
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
		this.ctx.log('error', 'Sync socket error', event, event.target);
		if (this.disposed || this.status !== 'active') return;
		// this could be an auth error which requires us to get a new token
		// so clearing the endpoint cache to force a refresh of the token too
		this.endpointProvider.clearCache();
		this.reconnectScheduler.next();

		this.ctx.log('info', `Attempting reconnect to websocket sync`);
	};

	private onClose = (event: CloseEvent) => {
		this.ctx.log('info', 'Sync socket disconnected', event.code);
		this.onOnlineChange(false);
		if (this.disposed || this.status !== 'active') return;
		this.reconnectScheduler.next();
		this.ctx.log('info', `Attempting reconnect to websocket sync`);
	};

	private initializeSocket = async () => {
		if (
			this.status !== 'active' ||
			this.connecting ||
			(this.socket && this.socket.readyState !== WEBSOCKET_CLOSED)
		) {
			return;
		}
		const generation = this.connectionGeneration;
		this.connecting = true;
		try {
			const endpoint = await this.endpointProvider.getEndpoints();
			if (
				generation !== this.connectionGeneration ||
				this.status !== 'active'
			) {
				return;
			}
			this.removeSocketListeners(this.socket);
			// abusing protocols to pass the auth token
			this.socket = new this.ctx.environment.WebSocket(endpoint.websocket, [
				'Bearer',
				endpoint.token,
			]);
			this.socket.addEventListener('message', this.onMessage);
			this.socket.addEventListener('open', this.onOpen);
			this.socket.addEventListener('error', this.onError);
			this.socket.addEventListener('close', this.onClose);
		} catch (error) {
			this.ctx.log('error', 'Failed to initialize sync socket', error);
			if (
				generation === this.connectionGeneration &&
				this.status === 'active'
			) {
				this.reconnectScheduler.next();
			}
		} finally {
			if (generation === this.connectionGeneration) {
				this.connecting = false;
			}
		}
	};

	private removeSocketListeners = (socket: WebSocket | null) => {
		socket?.removeEventListener('message', this.onMessage);
		socket?.removeEventListener('close', this.onClose);
		socket?.removeEventListener('error', this.onError);
		socket?.removeEventListener('open', this.onOpen);
	};

	private recoverSocket = (immediate: boolean) => {
		if (
			this.status !== 'active' ||
			this.connecting ||
			(this.socket && this.socket.readyState !== WEBSOCKET_CLOSED)
		) {
			return;
		}
		if (!immediate && this.reconnectScheduler.isScheduled) return;
		this.ctx.log('info', 'Recovering closed websocket sync connection');
		if (this.hasStartedSync) void this.onOnlineChange(false);
		this.reconnectScheduler.reset();
		void this.initializeSocket();
	};

	private onForeground = () => {
		if (this.status !== 'active') return;
		if (this.isConnected) this.heartbeat.start(true);
		else this.recoverSocket(true);
	};

	private onVisibilityChange = () => {
		if (document.visibilityState === 'visible') this.onForeground();
	};

	private onNetworkOnline = () => this.recoverSocket(true);
	private checkConnection = () => this.recoverSocket(false);
	private sendDisconnectingOnUnload = () => {
		void this.sendDisconnecting();
	};

	private sendHeartbeat = async () => {
		this.send(await (await this.ctx.meta).messageCreator.createHeartbeat());
	};

	reconnect = async () => {
		await this.stop();
		await this.start();
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
		if (this.status !== 'active') {
			this.ctx.log(
				'debug',
				'Ignoring outgoing message',
				message.type,
				'sync is not active',
			);
			return;
		}

		// wait until a sync has started before doing anything other than sync.
		// new "op" messages can arrive before sync has started, so we need to wait
		if (!this.hasStartedSync && !this.canSkipSyncWait(message)) {
			this.ctx.log(
				'debug',
				'Ignoring outgoing message',
				message.type,
				'still waiting to begin initial sync',
			);
			return;
		}

		if (this.canSkipSyncWait(message)) {
			if (this.socket?.readyState === WEBSOCKET_OPEN) {
				this.ctx.log(
					'debug',
					'Sending message',
					JSON.stringify(message, null, 2),
				);
				this.socket!.send(JSON.stringify(message));
			} else {
				this.ctx.log(
					'debug',
					'Enqueueing message until socket is open',
					JSON.stringify(message, null, 2),
				);
				this.connectQueue.push(message);
			}
		} else if (this.synced) {
			if (this.socket?.readyState === WEBSOCKET_OPEN) {
				this.ctx.log(
					'debug',
					'Sending message',
					JSON.stringify(message, null, 2),
				);
				this.socket.send(JSON.stringify(message));
			}
		} else if (this.hasStartedSync) {
			this.ctx.log(
				'debug',
				'Enqueueing message until synced',
				JSON.stringify(message, null, 2),
			);
			this.syncQueue.push(message);
		}
	};

	sendDisconnecting = async (reason = 'client-shutdown') => {
		return this.send(
			await (await this.ctx.meta).messageCreator.createDisconnecting(reason),
		);
	};

	destroy = () => {
		this.dispose();
		window.removeEventListener('beforeunload', this.sendDisconnectingOnUnload);
		void this.stop();
	};

	start = async () => {
		if (this.status === 'active' || this.disposed) return;
		this._status = 'active';
		window.addEventListener('pageshow', this.onForeground);
		window.addEventListener('online', this.onNetworkOnline);
		document.addEventListener('visibilitychange', this.onVisibilityChange);
		this.connectionCheck = setInterval(this.checkConnection, 5_000);
		await this.initializeSocket();
	};

	stop = async () => {
		const socket = this.socket;
		this.socket = null;
		this._status = 'paused';
		this.connectionGeneration++;
		this.connecting = false;
		this.hasStartedSync = false;
		this.synced = false;
		this.heartbeat.stop();
		this.reconnectScheduler.reset();
		if (this.connectionCheck) clearInterval(this.connectionCheck);
		this.connectionCheck = null;
		window.removeEventListener('pageshow', this.onForeground);
		window.removeEventListener('online', this.onNetworkOnline);
		document.removeEventListener('visibilitychange', this.onVisibilityChange);
		this.removeSocketListeners(socket);
		if (!socket) return;
		try {
			if (socket.readyState === WEBSOCKET_OPEN) {
				const message = await (
					await this.ctx.meta
				).messageCreator.createDisconnecting('client-shutdown');
				if (socket.readyState === WEBSOCKET_OPEN) {
					socket.send(JSON.stringify(message));
				}
			}
		} finally {
			if (socket.readyState === WEBSOCKET_OPEN || socket.readyState === 0) {
				socket.close();
			}
		}
	};

	ignoreIncoming(): void {
		this.incomingQueue = [];
		this._ignoreIncoming = true;
	}

	get isConnected() {
		return this.socket?.readyState === WEBSOCKET_OPEN;
	}

	get status() {
		return this._status;
	}
}

const WEBSOCKET_OPEN = 1;
const WEBSOCKET_CLOSED = 3;
