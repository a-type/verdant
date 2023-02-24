import {
	ClientMessage,
	DocumentBaseline,
	EventSubscriber,
	FileData,
	MessageReceivedMessage,
	Operation,
	ReplicaType,
	ServerMessage,
} from '@lo-fi/common';
import { Metadata } from '../metadata/Metadata.js';
import { PresenceManager } from '../PresenceManager.js';
import { EntityStore } from '../reactives/EntityStore.js';
import { FilePullResult, FileSync, FileUploadResult } from './FileSync.js';
import { PushPullSync } from './PushPullSync.js';
import {
	ServerSyncEndpointProvider,
	ServerSyncEndpointProviderConfig,
} from './ServerSyncEndpointProvider.js';
import { WebSocketSync } from './WebSocketSync.js';

type SyncEvents = {
	onlineChange: (isOnline: boolean) => void;
	message: (message: Omit<MessageReceivedMessage, 'type'>) => void;
};

export type SyncTransportEvents = {
	onlineChange: (isOnline: boolean) => void;
	incomingMessage: (message: ServerMessage) => void;
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

export interface Sync extends Omit<SyncTransport, 'send'> {
	setMode(mode: SyncTransportMode): void;
	setPullInterval(interval: number): void;
	readonly pullInterval: number;
	uploadFile(data: FileData): Promise<FileUploadResult>;
	getFile(fileId: string): Promise<FilePullResult>;
}

export class NoSync extends EventSubscriber<SyncEvents> implements Sync {
	readonly mode = 'pull';

	public send(): void {}

	public start(): void {}

	public stop(): void {}

	public dispose = () => {};

	public reconnect(): void {}

	public setMode(): void {}
	public setPullInterval(): void {}

	public readonly isConnected = false;
	public readonly status = 'paused';
	public readonly pullInterval = 0;

	public readonly presence = new PresenceManager({
		initialPresence: {},
		defaultProfile: {},
	});

	uploadFile = async () => {
		return {
			success: false,
			retry: false,
		};
	};

	getFile = async (): Promise<FilePullResult> => {
		return {
			success: false,
			retry: false,
		};
	};
}

export type SyncTransportMode = 'realtime' | 'pull';

export interface ServerSyncOptions<Profile = any, Presence = any>
	extends ServerSyncEndpointProviderConfig {
	/**
	 * When a client first connects, it will use this presence value.
	 */
	initialPresence: Presence;
	/**
	 * Before connecting to the server, the local client will have
	 * this value for their profile data. You can either cache and store
	 * profile data from a previous connection or provide defaults like
	 * empty strings.
	 */
	defaultProfile: Profile;

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

export class ServerSync<Profile = any, Presence = any>
	extends EventSubscriber<SyncEvents>
	implements Sync
{
	private webSocketSync: WebSocketSync;
	private pushPullSync: PushPullSync;
	private fileSync: FileSync;
	private activeSync: SyncTransport;
	private endpointProvider;
	private onData: (data: {
		operations: Operation[];
		baselines: DocumentBaseline[];
		reset?: boolean;
	}) => Promise<void>;

	private meta: Metadata;

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
			defaultProfile,
		}: ServerSyncOptions<Profile, Presence>,
		{
			meta,
			log,
			onData,
		}: {
			meta: Metadata;
			log?: (...args: any[]) => void;
			onData: (data: {
				operations: Operation[];
				baselines: DocumentBaseline[];
				reset?: boolean;
			}) => Promise<void>;
		},
	) {
		super();
		this.meta = meta;
		this.onData = onData;
		this.log = log || (() => {});
		this.presence = new PresenceManager<Profile, Presence>({
			initialPresence,
			defaultProfile,
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
		this.fileSync = new FileSync({
			endpointProvider: this.endpointProvider,
			log: this.log,
		});
		if (initialTransport === 'realtime') {
			this.activeSync = this.webSocketSync;
		} else {
			this.activeSync = this.pushPullSync;
		}

		this.presence.subscribe('update', this.handlePresenceUpdate);

		this.meta.subscribe('message', this.send);

		this.webSocketSync.subscribe('incomingMessage', this.handleMessage);
		this.webSocketSync.subscribe('onlineChange', this.handleOnlineChange);

		this.pushPullSync.subscribe('incomingMessage', this.handleMessage);
		this.pushPullSync.subscribe('onlineChange', this.handleOnlineChange);

		if (automaticTransportSelection) {
			// automatically shift between transport modes depending
			// on whether any peers are present
			let switchoverTimeout: NodeJS.Timer;
			this.presence.subscribe('peersChanged', (peers) => {
				if (switchoverTimeout) {
					clearTimeout(switchoverTimeout);
				}
				if (Object.keys(peers).length > 0) {
					// only upgrade if token allows it
					if (this.canDoRealtime) {
						if (this.mode === 'pull') {
							this.setMode('realtime');
						}
					}
				} else if (this.mode === 'realtime') {
					// wait 1 second then switch to pull mode if still emtpy
					switchoverTimeout = setTimeout(() => {
						if (Object.keys(this.presence.peers).length === 0) {
							this.setMode('pull');
						}
					}, 1000);
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
				await this.onData({
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
				await this.onData({
					operations: message.operations,
					baselines: message.baselines,
					reset: message.overwriteLocalData,
				});

				if (message.globalAckTimestamp) {
					await this.meta.setGlobalAck(message.globalAckTimestamp);
				}

				await this.meta.updateLastSynced(message.ackedTimestamp);
				break;
			case 'need-since':
				this.activeSync.send(
					await this.meta.messageCreator.createSyncStep1(message.since),
				);
				break;
			case 'message-received':
				this.emit('message', message);
				break;
			case 'server-ack':
				await this.meta.updateLastSynced(message.timestamp);
		}

		// update presence if necessary
		this.presence.__handleMessage(await this.meta.localReplica.get(), message);
	};
	private handleOnlineChange = (online: boolean) => {
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
		this.log('switching to', transport, 'mode');

		// transfer state to new sync
		if (this.activeSync.status === 'active') {
			newSync.start();
		}
		this.activeSync.stop();
		this.activeSync = newSync;
	};

	setPullInterval = (interval: number) => {
		this.pushPullSync.setInterval(interval);
	};

	get pullInterval() {
		return this.pushPullSync.interval;
	}

	private send = (message: ClientMessage) => {
		if (this.activeSync.status === 'active') {
			return this.activeSync.send(message);
		}
	};

	uploadFile = async (info: FileData) => {
		if (this.activeSync.status === 'active') {
			return this.fileSync.uploadFile(info);
		} else {
			return {
				success: false,
				retry: false,
			};
		}
	};

	getFile = async (id: string) => {
		// TODO: should this error? or just try anyway?
		if (this.activeSync.status === 'active') {
			return this.fileSync.getFile(id);
		} else {
			throw new Error('Offline, cannot retrieve remote file details');
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

	public sendMessage = async (message: string, toUserId?: string) => {
		this.send(
			await this.meta.messageCreator.createSendMessage(message, toUserId),
		);
	};
}
