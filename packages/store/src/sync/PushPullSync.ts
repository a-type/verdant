import {
	ClientMessage,
	EventSubscriber,
	PresenceUpdateMessage,
	ServerMessage,
	VerdantErrorCode,
	debounce,
	isVerdantErrorResponse,
	throttle,
} from '@verdant-web/common';
import { Metadata } from '../metadata/Metadata.js';
import { PresenceManager } from './PresenceManager.js';
import { Heartbeat } from './Heartbeat.js';
import { ServerSyncEndpointProvider } from './ServerSyncEndpointProvider.js';
import { SyncTransport, SyncTransportEvents } from './Sync.js';

export class PushPullSync
	extends EventSubscriber<SyncTransportEvents>
	implements SyncTransport
{
	readonly meta: Metadata;
	readonly presence: PresenceManager;
	private endpointProvider;
	private heartbeat;
	private fetch;

	readonly mode = 'pull';
	private log;

	private _isConnected = false;
	private _status: 'active' | 'paused' = 'paused';
	private _hasSynced = false;

	constructor({
		endpointProvider,
		meta,
		presence,
		interval = 15 * 1000,
		log = () => {},
		fetch = window.fetch.bind(window),
	}: {
		endpointProvider: ServerSyncEndpointProvider;
		meta: Metadata;
		presence: PresenceManager;
		interval?: number;
		log?: (...args: any[]) => any;
		fetch?: typeof window.fetch;
	}) {
		super();
		this.log = log;
		this.meta = meta;
		this.presence = presence;
		this.endpointProvider = endpointProvider;
		this.fetch = fetch;

		this.heartbeat = new Heartbeat({
			interval,
		});
		this.heartbeat.subscribe('beat', this.onHeartbeat);
		this.heartbeat.subscribe('missed', this.onHeartbeatMissed);
	}

	setInterval = (interval: number) => {
		this.heartbeat.setInterval(interval);
	};

	get interval() {
		return this.heartbeat.interval;
	}

	get hasSynced() {
		return this._hasSynced;
	}

	private sendRequest = async (messages: ClientMessage[]) => {
		this.log('Sending sync request', messages);
		try {
			const { http: host, token } = await this.endpointProvider.getEndpoints();
			const response = await this.fetch(host, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					messages,
				}),
				credentials: 'include',
			});
			if (response.ok) {
				this.heartbeat.keepAlive();
				const json = (await response.json()) as {
					messages: ServerMessage[];
				};
				// for (const message of json.messages) {
				// 	this.handleServerMessage(message);
				// }
				const handlePromise = Promise.all(
					json.messages.map(this.handleServerMessage),
				);
				if (!this._isConnected) {
					this._isConnected = true;
					this.emit('onlineChange', true);
				}
				await handlePromise;
			} else {
				this.log('Sync request failed', response.status, await response.text());

				if (this._isConnected) {
					this._isConnected = false;
					this.emit('onlineChange', false);
				}

				const json = await response.json();
				if (isVerdantErrorResponse(json)) {
					// token expired... retry again later after clearing it
					if (json.code === VerdantErrorCode.TokenExpired) {
						this.endpointProvider.clearCache();
						this.heartbeat.keepAlive();
					}
				}

				// only keep trying if the error was not 4xx
				if (response.status >= 500) {
					this.heartbeat.keepAlive();
				}
			}
		} catch (error) {
			if (this._isConnected) {
				this._isConnected = false;
				this.emit('onlineChange', false);
			}
			this.log(error);

			this.heartbeat.keepAlive();
		}
	};

	private handleServerMessage = async (message: ServerMessage) => {
		if (message.type === 'sync-resp') {
			// we need to ack the nonce to confirm that we received the sync-resp
			// but we can go ahead and preemptively allow ops to be sent
			this._hasSynced = true;
			if (message.ackThisNonce) {
				this.log('Sending sync ack', message.ackThisNonce);
				await this.sendRequest([
					await this.meta.messageCreator.createAck(message.ackThisNonce),
				]);
			}
		}
		this.emit('message', message);
	};

	// reduce rate of presence messages sent; each one would trigger an HTTP
	// request, which is not ideal if presence is updating rapidly.
	throttledPresenceUpdate = throttle((message: PresenceUpdateMessage) => {
		this.sendRequest([message]);
	}, 3000);

	send = (message: ClientMessage) => {
		// only certain messages are sent for pull-based sync.
		switch (message.type) {
			case 'presence-update':
				return this.throttledPresenceUpdate(message);
			case 'sync':
			case 'heartbeat':
				return this.sendRequest([message]);
			case 'op':
				if (this._hasSynced) {
					return this.sendRequest([message]);
				}
				break;
		}
	};

	start = async () => {
		if (this.status === 'active') {
			return;
		}
		await this.endpointProvider.getEndpoints();
		this.heartbeat.start(true);
		this._status = 'active';
	};
	stop(): void {
		this.heartbeat.stop();
		this._status = 'paused';
	}

	destroy = () => {
		this.dispose();
		this.stop();
	};
	reconnect(): void {
		this.heartbeat.start(true);
	}

	ignoreIncoming(): void {
		this.stop();
	}

	// on a heartbeat, do a sync
	private onHeartbeat = async () => {
		// for HTTP sync we send presence first, so that the sync-resp message
		// will include the client's own presence info and fill in missing profile
		// data on the first request. otherwise it would have to wait for the second.
		this.sendRequest([
			await this.meta.messageCreator.createPresenceUpdate(this.presence.self),
			await this.meta.messageCreator.createSyncStep1(),
		]);
	};

	// if the server fails to respond in a certain amount of time, we assume
	// the connection is lost and go offline.
	private onHeartbeatMissed = async () => {
		this.emit('onlineChange', false);
		this.log('Missed heartbeat');
		this._isConnected = false;
	};

	syncOnce = async () => {
		await this.sendRequest([await this.meta.messageCreator.createSyncStep1()]);
	};

	get isConnected(): boolean {
		return this._isConnected;
	}
	get status() {
		return this._status;
	}
}
