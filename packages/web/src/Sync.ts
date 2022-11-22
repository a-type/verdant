import {
	ClientMessage,
	ServerMessage,
	EventSubscriber,
	ObjectIdentifier,
	assert,
	ReplicaType,
} from '@lo-fi/common';
import { default as jwtDecode } from 'jwt-decode';
import { Backoff, BackoffScheduler } from './BackoffScheduler.js';
import { EntityStore } from './reactives/EntityStore.js';
import type { Presence } from './index.js';
import { Metadata } from './metadata/Metadata.js';
import { PresenceManager } from './PresenceManager.js';

type SyncEvents = {
	onlineChange: (isOnline: boolean) => void;
};

type SyncTransportEvents = SyncEvents & {
	message: (message: ServerMessage) => void;
};

export interface SyncTransport {
	subscribe(
		event: 'onlineChange',
		handler: (online: boolean) => void,
	): () => void;

	readonly presence: PresenceManager;

	readonly mode: SyncTransportMode;

	send(message: ClientMessage): void;

	start(): void;
	stop(): void;

	dispose(): void;

	reconnect(): void;

	readonly isConnected: boolean;
	readonly status: 'active' | 'paused';
}

export interface Sync extends SyncTransport {
	setMode(mode: SyncTransportMode): void;
}

export class NoSync extends EventSubscriber<SyncEvents> implements Sync {
	readonly mode = 'pull';

	public send(): void {}

	public start(): void {}

	public stop(): void {}

	public dispose = () => {};

	public reconnect(): void {}

	public setMode(): void {}

	public readonly isConnected = false;
	public readonly status = 'paused';

	public readonly presence = new PresenceManager({});
}

export interface ServerSyncEndpointProviderConfig {
	/**
	 * The location of the endpoint used to retrieve an
	 * authorization token for the client.
	 */
	authEndpoint?: string;
	/**
	 * A custom fetch function to retrieve authorization
	 * data.
	 */
	fetchAuth?: () => Promise<{
		accessToken: string;
	}>;
}

class ServerSyncEndpointProvider {
	private cached = null as {
		http: string;
		websocket: string;
	} | null;
	type: ReplicaType = ReplicaType.Realtime;

	constructor(private config: ServerSyncEndpointProviderConfig) {
		if (!config.authEndpoint && !config.fetchAuth) {
			throw new Error(
				'Either authEndpoint or fetchAuth must be provided to ServerSyncEndpointProvider',
			);
		}
	}

	getEndpoints = async () => {
		if (this.cached) {
			return this.cached;
		}

		let result: { accessToken: string };
		if (this.config.fetchAuth) {
			result = await this.config.fetchAuth();
		} else {
			result = await fetch(this.config.authEndpoint!, {
				credentials: 'include',
			}).then((res) => {
				if (!res.ok) {
					throw new Error(
						`Auth endpoint returned non-200 response: ${res.status}`,
					);
				} else {
					return res.json();
				}
			});
		}
		assert(result.accessToken, 'No access token provided from auth endpoint');
		const decoded = (jwtDecode as any)(result.accessToken);
		assert(decoded.url, 'No sync endpoint provided from auth endpoint');
		assert(
			decoded.type !== undefined,
			'No replica type provided from auth endpoint',
		);
		this.type = parseInt(decoded.type + '');
		const url = new URL(decoded.url);
		url.searchParams.set('token', result.accessToken);
		url.protocol = url.protocol.replace('ws', 'http');
		const httpEndpoint = url.toString();
		url.protocol = url.protocol.replace('http', 'ws');
		const websocketEndpoint = url.toString();
		this.cached = { http: httpEndpoint, websocket: websocketEndpoint };
		return this.cached;
	};
}

export type SyncTransportMode = 'realtime' | 'pull';

export interface ServerSyncOptions extends ServerSyncEndpointProviderConfig {
	/**
	 * When a client first connects, it will use this presence value.
	 */
	initialPresence: Presence;

	/**
	 * Provide `false` to disable transport selection. Transport selection
	 * automatically switches between HTTP and WebSocket based sync depending
	 * on the number of peers connected. If a user is alone, they will use
	 * HTTP push/pull to sync changes. If another user joins, both users will
	 * be upgraded to websockets.
	 *
	 * Turning off this feature allows you more control over the transport
	 * which can be useful for low-power devices or to save server traffic.
	 * To modify transport modes manually, utilize `client.sync.setMode`.
	 * The built-in behavior is essentially switching modes based on
	 * the number of peers detected by client.sync.presence.
	 */
	automaticTransportSelection?: boolean;
	initialTransport?: SyncTransportMode;
	autoStart?: boolean;
	/**
	 * Optionally specify an interval, in milliseconds, to poll the server
	 * when in pull mode.
	 */
	pullInterval?: number;
	/**
	 * Presence updates are batched to reduce number of requests / messages
	 * sent to the server. You can specify the batching time slice, in milliseconds,
	 */
	presenceUpdateBatchTimeout?: number;
}

export class ServerSync extends EventSubscriber<SyncEvents> implements Sync {
	private webSocketSync: WebSocketSync;
	private pushPullSync: PushPullSync;
	private activeSync: SyncTransport;
	private endpointProvider;

	private meta: Metadata;
	private entities: EntityStore;

	readonly presence;

	private log;

	constructor(
		{
			authEndpoint,
			fetchAuth,
			initialPresence,
			automaticTransportSelection = true,
			autoStart,
			initialTransport,
			pullInterval,
			presenceUpdateBatchTimeout,
		}: ServerSyncOptions,
		{
			meta,
			entities,
			log,
		}: {
			meta: Metadata;
			entities: EntityStore;
			log?: (...args: any[]) => void;
		},
	) {
		super();
		this.meta = meta;
		this.entities = entities;
		this.log = log || (() => {});
		this.presence = new PresenceManager({
			initialPresence,
			updateBatchTimeout: presenceUpdateBatchTimeout,
		});
		this.endpointProvider = new ServerSyncEndpointProvider({
			authEndpoint,
			fetchAuth,
		});

		this.webSocketSync = new WebSocketSync({
			endpointProvider: this.endpointProvider,
			meta,
			presence: this.presence,
			log: this.log,
		});
		this.pushPullSync = new PushPullSync({
			endpointProvider: this.endpointProvider,
			meta,
			presence: this.presence,
			log: this.log,
			interval: pullInterval,
		});
		if (initialTransport === 'realtime') {
			this.activeSync = this.webSocketSync;
		} else {
			this.activeSync = this.pushPullSync;
		}

		this.presence.subscribe('update', this.handlePresenceUpdate);

		this.meta.subscribe('message', this.send);

		this.webSocketSync.subscribe('message', this.handleMessage);
		this.webSocketSync.subscribe('onlineChange', this.echoOnlineChange);

		this.pushPullSync.subscribe('message', this.handleMessage);
		this.pushPullSync.subscribe('onlineChange', this.echoOnlineChange);

		if (automaticTransportSelection) {
			// automatically shift between transport modes depending
			// on whether any peers are present
			this.presence.subscribe('peersChanged', (peers) => {
				if (Object.keys(peers).length > 0) {
					// only upgrade if token allows it
					if (this.canDoRealtime) {
						if (this.mode === 'pull') {
							this.setMode('realtime');
						}
					}
				} else {
					if (this.mode === 'realtime') {
						this.setMode('pull');
					}
				}
			});
		}

		if (autoStart) {
			this.start();
		}
	}

	get canDoRealtime() {
		return (
			this.endpointProvider.type === ReplicaType.Realtime ||
			this.endpointProvider.type === ReplicaType.PassiveRealtime ||
			this.endpointProvider.type === ReplicaType.ReadOnlyRealtime
		);
	}

	private handleMessage = async (message: ServerMessage) => {
		// TODO: move this into metadata
		if (message.type === 'op-re' || message.type === 'sync-resp') {
			for (const op of message.operations) {
				this.meta.time.update(op.timestamp);
			}
		}

		this.log('sync message', JSON.stringify(message, null, 2));
		switch (message.type) {
			case 'op-re':
				await this.entities.addData({
					operations: message.operations,
					baselines: message.baselines,
				});
				if (message.globalAckTimestamp) {
					await this.meta.setGlobalAck(message.globalAckTimestamp);
				}
				break;
			case 'global-ack':
				await this.meta.setGlobalAck(message.timestamp);
				break;
			case 'sync-resp':
				await this.entities.addData({
					operations: message.operations,
					baselines: message.baselines,
					reset: message.overwriteLocalData,
				});

				if (message.globalAckTimestamp) {
					await this.meta.setGlobalAck(message.globalAckTimestamp);
				}

				await this.meta.updateLastSynced(message.ackedTimestamp);
				break;
			case 'server-ack':
				await this.meta.updateLastSynced(message.timestamp);
		}

		// update presence if necessary
		this.presence.__handleMessage(await this.meta.localReplica.get(), message);
	};
	private echoOnlineChange = (online: boolean) => {
		this.emit('onlineChange', online);
	};
	private handlePresenceUpdate = async (presence: any) => {
		this.send(await this.meta.messageCreator.createPresenceUpdate(presence));
	};

	setMode = (transport: SyncTransportMode) => {
		if (transport === 'realtime' && !this.canDoRealtime) {
			throw new Error(
				`Cannot switch to realtime mode, because the current auth token does not allow it`,
			);
		}

		let newSync: SyncTransport;
		if (transport === 'realtime') {
			newSync = this.webSocketSync;
		} else {
			newSync = this.pushPullSync;
		}

		if (newSync === this.activeSync) return;

		// transfer state to new sync
		if (this.activeSync.status === 'active') {
			newSync.start();
		}
		this.activeSync.stop();
		this.activeSync = newSync;
	};

	public send = (message: ClientMessage) => {
		if (this.activeSync.status === 'active') {
			return this.activeSync.send(message);
		}
	};

	public start = () => {
		return this.activeSync.start();
	};

	public stop = () => {
		return this.activeSync.stop();
	};

	public dispose = () => {
		this.webSocketSync.dispose();
		this.pushPullSync.dispose();
	};

	public reconnect = () => {
		return this.activeSync.reconnect();
	};

	public get isConnected(): boolean {
		return this.activeSync.isConnected;
	}

	public get status() {
		return this.activeSync.status;
	}

	public get mode() {
		return this.activeSync.mode;
	}
}

class WebSocketSync
	extends EventSubscriber<SyncTransportEvents>
	implements SyncTransport
{
	private meta: Metadata;
	readonly presence: PresenceManager;
	private socket: WebSocket | null = null;
	private messageQueue: ClientMessage[] = [];
	private endpointProvider;
	private _status: 'active' | 'paused' = 'paused';
	private synced = false;

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
		if (this.messageQueue.length) {
			for (const msg of this.messageQueue) {
				this.log('Sending queued message', JSON.stringify(msg, null, 2));
				this.socket.send(JSON.stringify(msg));
			}
			this.messageQueue = [];
		}
		this.log('Sync connected');
		this.onOnlineChange(true);
		this.reconnectScheduler.reset();
	};

	private onOnlineChange = async (online: boolean) => {
		this.log('Socket online change', online);
		if (!online) {
			this.heartbeat.stop();
		} else {
			this.send(await this.meta.messageCreator.createSyncStep1());
			this.send(
				await this.meta.messageCreator.createPresenceUpdate(
					this.presence.self.presence,
				),
			);
			this.heartbeat.start();
		}
		this.emit('onlineChange', online);
	};

	private onMessage = (event: MessageEvent) => {
		const message = JSON.parse(event.data) as ServerMessage;
		this.emit('message', message);
		if (message.type === 'heartbeat-response') {
			this.heartbeat.keepAlive();
		}
		if (message.type === 'sync-resp') {
			this.synced = true;
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
		this.socket = new WebSocket(endpoint.websocket);
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

	send = (message: ClientMessage) => {
		// ignore new messages until synced
		if (
			!this.synced &&
			message.type !== 'sync' &&
			message.type !== 'presence-update'
		) {
			return;
		}

		if (this.socket?.readyState === WebSocket.OPEN) {
			this.log('Sending message', JSON.stringify(message, null, 2));
			this.socket.send(JSON.stringify(message));
		} else if (this._status === 'active') {
			this.messageQueue.push(message);
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

class PushPullSync
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
				const json = (await response.json()) as {
					messages: ServerMessage[];
				};
				for (const message of json.messages) {
					this.handleServerMessage(message);
				}
				this.heartbeat.keepAlive();
				if (!this._isConnected) {
					this._isConnected = true;
					this.emit('onlineChange', true);
				}
			} else {
				console.error(
					'Sync request failed',
					response.status,
					await response.text(),
				);

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
			console.error(error);

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
		this._isConnected = false;
	};

	get isConnected(): boolean {
		return this._isConnected;
	}
	get status() {
		return this._status;
	}
}

class Heartbeat extends EventSubscriber<{
	missed: () => void;
	beat: () => void;
}> {
	private interval: number;
	private deadlineLength: number;
	private nextBeat: NodeJS.Timeout | null = null;
	private deadline: NodeJS.Timeout | null = null;

	constructor({
		interval = 15 * 1000,
		deadlineLength = 3 * 1000,
	}: {
		interval?: number;
		deadlineLength?: number;
	} = {}) {
		super();
		this.interval = interval;
		this.deadlineLength = deadlineLength;
	}

	keepAlive = () => {
		if (this.deadline) {
			clearTimeout(this.deadline);
			this.deadline = null;
			this.start();
		}
	};

	start = (immediate = false) => {
		if (immediate) {
			this.beat();
		} else {
			this.nextBeat = setTimeout(this.beat, this.interval);
		}
	};

	stop = () => {
		if (this.nextBeat) {
			clearTimeout(this.nextBeat);
		}
		if (this.deadline) {
			clearTimeout(this.deadline);
		}
	};

	private beat = async () => {
		this.emit('beat');
		this.deadline = setTimeout(this.onDeadline, this.deadlineLength);
	};

	private onDeadline = () => {
		this.deadline = null;
		this.emit('missed');
	};
}
