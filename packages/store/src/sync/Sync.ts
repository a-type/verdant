import {
	ClientMessage,
	DocumentBaseline,
	EventSubscriber,
	FileData,
	Operation,
	ReplicaType,
	ServerMessage,
} from '@verdant-web/common';
import { Metadata } from '../metadata/Metadata.js';
import { HANDLE_MESSAGE, PresenceManager } from './PresenceManager.js';
import { FilePullResult, FileSync, FileUploadResult } from './FileSync.js';
import { PushPullSync } from './PushPullSync.js';
import {
	ServerSyncEndpointProvider,
	ServerSyncEndpointProviderConfig,
} from './ServerSyncEndpointProvider.js';
import { WebSocketSync } from './WebSocketSync.js';

type SyncEvents = {
	onlineChange: (isOnline: boolean) => void;
	syncingChange: (syncing: boolean) => void;
};

export type SyncTransportEvents = SyncEvents & {
	message: (message: ServerMessage) => void;
};

export interface SyncTransport extends EventSubscriber<SyncTransportEvents> {
	readonly presence: PresenceManager;

	readonly mode: SyncTransportMode;

	send(message: ClientMessage): void;

	start(): void;
	ignoreIncoming(): void;
	stop(): void;

	destroy(): void;

	reconnect(): void;

	readonly isConnected: boolean;
	readonly status: 'active' | 'paused';
}

export interface Sync<Presence = any, Profile = any>
	extends EventSubscriber<SyncEvents> {
	setMode(mode: SyncTransportMode): void;
	setPullInterval(interval: number): void;
	readonly pullInterval: number;
	uploadFile(data: FileData): Promise<FileUploadResult>;
	getFile(fileId: string): Promise<FilePullResult>;
	readonly presence: PresenceManager<Profile, Presence>;
	send(message: ClientMessage): void;
	start(): void;
	stop(): void;
	ignoreIncoming(): void;
	destroy(): void;
	reconnect(): void;
	readonly isConnected: boolean;
	readonly status: 'active' | 'paused';
	readonly mode: SyncTransportMode;
}

export class NoSync<Presence = any, Profile = any>
	extends EventSubscriber<SyncEvents>
	implements Sync<Presence, Profile>
{
	readonly mode = 'pull';

	public send(): void {}

	public start(): void {}

	public stop(): void {}

	public ignoreIncoming(): void {}

	public destroy = () => {};

	public reconnect(): void {}

	public setMode(): void {}
	public setPullInterval(): void {}

	public readonly isConnected = false;
	public readonly status = 'paused';
	public readonly pullInterval = 0;

	public readonly presence;

	constructor({ meta }: { meta: Metadata }) {
		super();
		this.presence = new PresenceManager({
			initialPresence: null as any,
			defaultProfile: null as any,
			replicaStore: meta.localReplica,
		});
	}

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
	 * Provide `peers-only` to only automatically use websockets if other
	 * users connect, but not if another device for the current user connects.
	 * By default, automatic transport selection will upgrade to websockets if
	 * another device from the current user connects, but if realtime sync is
	 * not necessary for such cases, you can save bandwidth by disabling this.
	 *
	 * Turning off this feature allows you more control over the transport
	 * which can be useful for low-power devices or to save server traffic.
	 * To modify transport modes manually, utilize `client.sync.setMode`.
	 * The built-in behavior is essentially switching modes based on
	 * the number of peers detected by client.sync.presence.
	 */
	automaticTransportSelection?: boolean | 'peers-only';
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
	/**
	 * Experimental: sync messages over a broadcast channel between tabs.
	 * Fixes tabs not reactively updating to changes when other tabs are open,
	 * but is not yet thoroughly vetted.
	 */
	useBroadcastChannel?: boolean;
}

export class ServerSync<Presence = any, Profile = any>
	extends EventSubscriber<SyncEvents>
	implements Sync<Presence, Profile>
{
	private webSocketSync: WebSocketSync;
	private pushPullSync: PushPullSync;
	private fileSync: FileSync;
	private activeSync: SyncTransport;
	private endpointProvider;
	private onData: (data: {
		operations: Operation[];
		baselines?: DocumentBaseline[];
		reset?: boolean;
	}) => Promise<void>;
	private broadcastChannel: BroadcastChannel | null = null;
	private _activelySyncing = false;

	private meta: Metadata;

	readonly presence: PresenceManager<Profile, Presence>;

	private log;

	constructor(
		{
			authEndpoint,
			fetchAuth,
			fetch,
			initialPresence,
			automaticTransportSelection = true,
			autoStart,
			initialTransport,
			pullInterval,
			presenceUpdateBatchTimeout,
			defaultProfile,
			useBroadcastChannel,
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
				baselines?: DocumentBaseline[];
				reset?: boolean;
			}) => Promise<void>;
		},
	) {
		super();
		this.meta = meta;
		this.onData = onData;
		this.log = log || (() => {});
		this.presence = new PresenceManager({
			initialPresence,
			defaultProfile,
			updateBatchTimeout: presenceUpdateBatchTimeout,
			replicaStore: meta.localReplica,
		});
		this.endpointProvider = new ServerSyncEndpointProvider({
			authEndpoint,
			fetchAuth,
			fetch,
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
			fetch,
		});
		this.fileSync = new FileSync({
			endpointProvider: this.endpointProvider,
			log: this.log,
		});
		if (useBroadcastChannel && 'BroadcastChannel' in window) {
			this.broadcastChannel = new BroadcastChannel('verdant');
			this.broadcastChannel.addEventListener(
				'message',
				this.handleBroadcastChannelMessage,
			);
		}
		if (initialTransport === 'realtime') {
			this.activeSync = this.webSocketSync;
		} else {
			this.activeSync = this.pushPullSync;
		}

		this.presence.subscribe('update', this.handlePresenceUpdate);

		this.meta.subscribe('message', this.send);

		this.webSocketSync.subscribe('message', this.handleMessage);
		this.webSocketSync.subscribe('onlineChange', this.handleOnlineChange);

		this.pushPullSync.subscribe('message', this.handleMessage);
		this.pushPullSync.subscribe('onlineChange', this.handleOnlineChange);

		if (automaticTransportSelection && this.canDoRealtime) {
			// automatically shift between transport modes depending
			// on whether any peers are present
			const decideIfUpgrade = () => {
				if (switchoverTimeout) {
					clearTimeout(switchoverTimeout);
				}
				const hasPeers = Object.keys(this.presence.peers).length > 0;
				const shouldUpgrade =
					hasPeers ||
					(automaticTransportSelection !== 'peers-only' &&
						this.presence.selfReplicaIds.size > 1);
				if (shouldUpgrade && this.mode === 'pull') {
					this.setMode('realtime');
				} else if (!shouldUpgrade && this.mode === 'realtime') {
					// wait 1 second then switch to pull mode if still empty
					switchoverTimeout = setTimeout(() => {
						if (Object.keys(this.presence.peers).length === 0) {
							this.setMode('pull');
						}
					}, 1000);
				}
			};
			let switchoverTimeout: NodeJS.Timeout;
			this.presence.subscribe('peersChanged', decideIfUpgrade);
			if (automaticTransportSelection !== 'peers-only') {
				this.presence.subscribe('selfChanged', decideIfUpgrade);
			}
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

	get syncing() {
		return this._activelySyncing;
	}

	private handleBroadcastChannelMessage = (event: MessageEvent) => {
		if (event.data.type === 'sync') {
			this.handleMessage(event.data.message, { source: 'broadcastChannel' });
		}
	};

	private onTokenExpired = () => {
		this.endpointProvider.clearCache();
	};

	private handleMessage = async (
		message: ServerMessage,
		{ source }: { source: 'network' | 'broadcastChannel' } = {
			source: 'network',
		},
	) => {
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
				this._activelySyncing = true;
				this.emit('syncingChange', true);
				await this.onData({
					operations: message.operations,
					baselines: message.baselines,
					reset: message.overwriteLocalData,
				});

				if (message.globalAckTimestamp) {
					await this.meta.setGlobalAck(message.globalAckTimestamp);
				}

				await this.meta.updateLastSynced(message.ackedTimestamp);
				this._activelySyncing = false;
				this.emit('syncingChange', false);
				break;
			case 'need-since':
				this.activeSync.send(
					await this.meta.messageCreator.createSyncStep1(message.since),
				);
				break;
			case 'server-ack':
				await this.meta.updateLastSynced(message.timestamp);
		}

		// avoid rebroadcasting messages
		if (source === 'network') {
			this.broadcastChannel?.postMessage({
				type: 'sync',
				message,
			});
		}

		// update presence if necessary
		this.presence[HANDLE_MESSAGE](await this.meta.localReplica.get(), message);
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
		this.log('debug', 'switching to', transport, 'mode');

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

	send = (message: ClientMessage) => {
		if (this.activeSync.status === 'active') {
			return this.activeSync.send(message);
		}
	};

	uploadFile = async (info: FileData) => {
		this.log('info', 'Uploading file', {
			name: info.name,
			type: info.type,
			id: info.id,
		});
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

	public ignoreIncoming(): void {
		this.activeSync.ignoreIncoming();
	}

	public destroy = () => {
		this.dispose();
		this.webSocketSync.destroy();
		this.pushPullSync.destroy();
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
