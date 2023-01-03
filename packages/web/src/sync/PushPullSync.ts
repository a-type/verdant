import { ClientMessage, EventSubscriber, ServerMessage } from '@lo-fi/common';
import { Metadata } from '../metadata/Metadata.js';
import { PresenceManager } from '../PresenceManager.js';
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
	}: {
		endpointProvider: ServerSyncEndpointProvider;
		meta: Metadata;
		presence: PresenceManager;
		interval?: number;
		log?: (...args: any[]) => any;
	}) {
		super();
		this.log = log;
		this.meta = meta;
		this.presence = presence;
		this.endpointProvider = endpointProvider;

		this.heartbeat = new Heartbeat({
			interval,
		});
		this.heartbeat.subscribe('beat', this.onHeartbeat);
		this.heartbeat.subscribe('missed', this.onHeartbeatMissed);
	}

	setInterval = (interval: number) => {
		this.heartbeat.setInterval(interval);
	};

	private sendRequest = async (messages: ClientMessage[]) => {
		this.log('Sending sync request');
		try {
			const { http: host } = await this.endpointProvider.getEndpoints();
			const response = await fetch(host, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
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
				for (const message of json.messages) {
					this.handleServerMessage(message);
				}
				if (!this._isConnected) {
					this._isConnected = true;
					this.emit('onlineChange', true);
				}
			} else {
				this.log('Sync request failed', response.status, await response.text());

				if (this._isConnected) {
					this._isConnected = false;
					this.emit('onlineChange', false);
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

	private handleServerMessage = (message: ServerMessage) => {
		if (message.type === 'sync-resp') {
			this._hasSynced = true;
		}
		this.emit('message', message);
	};

	send = (message: ClientMessage) => {
		// only certain messages are sent for pull-based sync.
		switch (message.type) {
			case 'presence-update':
			case 'sync':
				this.sendRequest([message]);
				break;
			case 'op':
				if (this._hasSynced) {
					this.sendRequest([message]);
				}
				break;
		}
	};

	start(): void {
		if (this.status === 'active') {
			return;
		}
		this.heartbeat.start(true);
		this._status = 'active';
	}
	stop(): void {
		this.heartbeat.stop();
		this._status = 'paused';
	}

	dispose = () => {};
	reconnect(): void {}

	// on a heartbeat, do a sync
	private onHeartbeat = async () => {
		// for HTTP sync we send presence first, so that the sync-resp message
		// will include the client's own presence info and fill in missing profile
		// data on the first request. otherwise it would have to wait for the second.
		this.sendRequest([
			await this.meta.messageCreator.createPresenceUpdate(
				this.presence.self.presence,
			),
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

	get isConnected(): boolean {
		return this._isConnected;
	}
	get status() {
		return this._status;
	}
}
