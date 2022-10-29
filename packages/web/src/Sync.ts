import {
	ClientMessage,
	ServerMessage,
	EventSubscriber,
	ObjectIdentifier,
	getOidRoot,
	assert,
} from '@lo-fi/common';
import { Backoff, BackoffScheduler } from './BackoffScheduler.js';
import { EntityStore } from './EntityStore.js';
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

	public dispose(): void {}

	public reconnect(): void {}

	public setMode(): void {}

	public readonly isConnected = false;
	public readonly status = 'paused';

	public readonly presence = new PresenceManager();
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
		syncEndpoint: string;
	}>;
}

class ServerSyncEndpointProvider {
	private cached = null as {
		http: string;
		websocket: string;
	} | null;

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

		let result: { accessToken: string; syncEndpoint: string };
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
		assert(result.syncEndpoint, 'No sync endpoint provided from auth endpoint');
		const url = new URL(result.syncEndpoint);
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
}

export class ServerSync extends EventSubscriber<SyncEvents> implements Sync {
	private webSocketSync: WebSocketSync;
	private pushPullSync: PushPullSync;
	private activeSync: SyncTransport;
	private endpointProvider;

	private meta: Metadata;
	private entities: EntityStore;

	readonly presence;

	constructor(
		{
			authEndpoint,
			fetchAuth,
			initialPresence,
			automaticTransportSelection = true,
		}: ServerSyncOptions,
		{
			meta,
			entities,
		}: {
			meta: Metadata;
			entities: EntityStore;
		},
	) {
		super();
		this.meta = meta;
		this.entities = entities;
		this.presence = new PresenceManager(initialPresence);
		this.endpointProvider = new ServerSyncEndpointProvider({
			authEndpoint,
			fetchAuth,
		});

		this.webSocketSync = new WebSocketSync({
			endpointProvider: this.endpointProvider,
			meta,
			presence: this.presence,
		});
		this.pushPullSync = new PushPullSync({
			endpointProvider: this.endpointProvider,
			meta,
			presence: this.presence,
		});
		this.activeSync = this.pushPullSync;

		this.presence.subscribe('update', this.handlePresenceUpdate);

		this.entities.subscribe('message', this.send);
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
					if (this.mode === 'pull') {
						this.setMode('realtime');
					}
				} else {
					if (this.mode === 'realtime') {
						this.setMode('pull');
					}
				}
			});
		}
	}

	private handleMessage = async (message: ServerMessage) => {
		// TODO: move this into metadata
		if (message.type === 'op-re' || message.type === 'sync-resp') {
			for (const op of message.operations) {
				this.meta.time.update(op.timestamp);
			}
		}

		let affectedOids: ObjectIdentifier[] | undefined = undefined;
		switch (message.type) {
			case 'op-re':
				// rebroadcasted operations
				affectedOids = await this.meta.insertRemoteOperations(
					message.operations,
				);
				await this.meta.setGlobalAck(message.globalAckTimestamp);
				break;
			case 'global-ack':
				await this.meta.setGlobalAck(message.timestamp);
				break;
			case 'sync-resp':
				if (message.overwriteLocalData) {
					await this.meta.reset();
					await this.entities.reset();
				}

				// add any baselines
				await this.meta.baselines.setAll(message.baselines);

				affectedOids = await this.meta.insertRemoteOperations(
					message.operations,
				);

				await this.meta.setGlobalAck(message.globalAckTimestamp);

				// respond to the server
				this.activeSync.send(
					await this.meta.messageCreator.createSyncStep2(
						message.provideChangesSince,
					),
				);
				await this.meta.updateLastSynced();
				break;
		}

		// update presence if necessary
		this.presence.__handleMessage(await this.meta.localReplica.get(), message);

		if (affectedOids?.length) {
			this.entities.refreshAll(affectedOids);
		}
	};
	private echoOnlineChange = (online: boolean) => {
		this.emit('onlineChange', online);
	};
	private handlePresenceUpdate = async (presence: any) => {
		this.send(await this.meta.messageCreator.createPresenceUpdate(presence));
	};

	setMode = (transport: SyncTransportMode) => {
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
		return this.activeSync.send(message);
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

	readonly mode = 'realtime';

	private heartbeat = new Heartbeat();

	private reconnectScheduler = new BackoffScheduler(
		new Backoff(60 * 1000, 1.5),
	);

	constructor({
		endpointProvider,
		meta,
		presence,
	}: {
		endpointProvider: ServerSyncEndpointProvider;
		meta: Metadata;
		presence: PresenceManager;
	}) {
		super();
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
		if (this.messageQueue.length) {
			for (const msg of this.messageQueue) {
				this.socket.send(JSON.stringify(msg));
			}
			this.messageQueue = [];
		}
		console.info('Sync connected');
		this.onOnlineChange(true);
		this.reconnectScheduler.reset();
	};

	private onOnlineChange = async (online: boolean) => {
		if (!online) {
			this.heartbeat.stop();
		} else {
			const lastSyncTimestamp = await this.meta.lastSyncedTimestamp();
			this.send(
				await this.meta.messageCreator.createSyncStep1(!lastSyncTimestamp),
			);
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
	};

	private onError = (event: Event) => {
		console.error(event);
		this.reconnectScheduler.next();

		console.info(`Attempting reconnect to websocket sync`);
	};

	private onClose = (event: CloseEvent) => {
		console.info('Sync disconnected');
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
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify(message));
		} else {
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
	private heartbeat = new Heartbeat();

	readonly mode = 'pull';

	private _isConnected = false;
	private _status: 'active' | 'paused' = 'paused';

	constructor({
		endpointProvider,
		meta,
		presence,
	}: {
		endpointProvider: ServerSyncEndpointProvider;
		meta: Metadata;
		presence: PresenceManager;
	}) {
		super();
		this.meta = meta;
		this.presence = presence;
		this.endpointProvider = endpointProvider;

		this.heartbeat.subscribe('beat', this.onHeartbeat);
		this.heartbeat.subscribe('missed', this.onHeartbeatMissed);
	}

	private sendRequest = async (messages: ClientMessage[]) => {
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
				throw new Error(
					`Sync server responded with ${
						response.status
					}\n${await response.text()}`,
				);
			}
		} catch (error) {
			if (this._isConnected) {
				this._isConnected = false;
				this.emit('onlineChange', false);
			}
			console.error(error);
		}
	};

	private handleServerMessage = (message: ServerMessage) => {
		this.emit('message', message);
	};

	send = (message: ClientMessage) => {
		// only certain messages are sent for pull-based sync.
		switch (message.type) {
			case 'presence-update':
			case 'sync':
			case 'sync-step2':
				this.sendRequest([message]);
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

	dispose(): void {}
	reconnect(): void {}

	// on a heartbeat, do a sync
	private onHeartbeat = async () => {
		const lastSyncTimestamp = await this.meta.lastSyncedTimestamp();
		// for HTTP sync we send presence first, so that the sync-resp message
		// will include the client's own presence info and fill in missing profile
		// data on the first request. otherwise it would have to wait for the second.
		this.sendRequest([
			await this.meta.messageCreator.createPresenceUpdate(
				this.presence.self.presence,
			),
			await this.meta.messageCreator.createSyncStep1(!lastSyncTimestamp),
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
