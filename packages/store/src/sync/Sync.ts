import {
	ClientMessage,
	DocumentBaseline,
	EventSubscriber,
	FileData,
	Operation,
	ReplicaType,
	rewriteAuthzOriginator,
	ServerMessage,
	VerdantError,
	VerdantInternalPresence,
} from '@verdant-web/common';
import { HANDLE_MESSAGE, PresenceManager } from './PresenceManager.js';
import { FilePullResult, FileSync, FileUploadResult } from './FileSync.js';
import { PushPullSync } from './PushPullSync.js';
import {
	ServerSyncEndpointProvider,
	ServerSyncEndpointProviderConfig,
} from './ServerSyncEndpointProvider.js';
import { WebSocketSync } from './WebSocketSync.js';
import { Context } from '../context/context.js';
import { attemptToRegisterBackgroundSync } from './background.js';

type SyncEvents = {
	onlineChange: (isOnline: boolean) => void;
	syncingChange: (syncing: boolean) => void;
	synced: () => void;
	/** When the server has lost data and re-requests data from the past */
	serverReset: (since: string | null) => void;
};

export type SyncTransportEvents = SyncEvents & {
	message: (message: ServerMessage) => void;
};

export interface SyncTransport extends EventSubscriber<SyncTransportEvents> {
	readonly presence: PresenceManager;

	readonly mode: SyncTransportMode;
	readonly hasSynced: boolean;

	send(message: ClientMessage): void;

	start(): Promise<void>;
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
	start(): Promise<void>;
	stop(): void;
	ignoreIncoming(): void;
	destroy(): void;
	reconnect(): void;
	syncOnce(): Promise<void>;
	readonly isConnected: boolean;
	readonly status: 'active' | 'paused';
	readonly mode: SyncTransportMode;
	readonly hasSynced: boolean;
}

export class NoSync<Presence = any, Profile = any>
	extends EventSubscriber<SyncEvents>
	implements Sync<Presence, Profile>
{
	readonly mode = 'pull';
	readonly hasSynced = false;

	public send(): void {}

	public async start(): Promise<void> {}

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

	constructor(ctx: Context) {
		super();
		this.presence = new PresenceManager({
			initialPresence: null as any,
			defaultProfile: null as any,
			ctx,
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
			error: 'Sync is not active',
		};
	};

	syncOnce: () => Promise<void> = async () => {};
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
	/**
	 * Listen for outgoing messages from the client to the server.
	 * Not sure why you want to do this, but be careful.
	 */
	onOutgoingMessage?: (message: ClientMessage) => void;

	EXPERIMENTAL_backgroundSync?: boolean;
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
	private _hasSynced = false;

	readonly presence: PresenceManager<Profile, Presence>;

	private onOutgoingMessage?: (message: ClientMessage) => void;

	private ctx;

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
			useBroadcastChannel,
			onOutgoingMessage,
			EXPERIMENTAL_backgroundSync,
		}: ServerSyncOptions<Profile, Presence>,
		{
			ctx,
			onData,
		}: {
			ctx: Context;
			onData: (data: {
				operations: Operation[];
				baselines?: DocumentBaseline[];
				reset?: boolean;
			}) => Promise<void>;
		},
	) {
		super();
		this.onData = onData;
		this.ctx = ctx;
		this.onOutgoingMessage = onOutgoingMessage;
		this.presence = new PresenceManager({
			initialPresence,
			defaultProfile,
			updateBatchTimeout: presenceUpdateBatchTimeout,
			ctx,
		});
		this.endpointProvider = new ServerSyncEndpointProvider(
			{
				authEndpoint,
				fetchAuth,
			},
			ctx,
		);

		this.webSocketSync = new WebSocketSync({
			endpointProvider: this.endpointProvider,
			presence: this.presence,
			ctx,
		});
		this.pushPullSync = new PushPullSync({
			endpointProvider: this.endpointProvider,
			presence: this.presence,
			interval: pullInterval,
			ctx,
		});
		this.fileSync = new FileSync({
			endpointProvider: this.endpointProvider,
			ctx,
		});
		if (useBroadcastChannel && 'BroadcastChannel' in window) {
			this.broadcastChannel = new BroadcastChannel(`verdant-${ctx.namespace}`);
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

		ctx.meta.events.subscribe('syncMessage', this.send);

		this.webSocketSync.subscribe('message', this.handleMessage);
		this.webSocketSync.subscribe('onlineChange', this.handleOnlineChange);

		this.pushPullSync.subscribe('message', this.handleMessage);
		this.pushPullSync.subscribe('onlineChange', this.handleOnlineChange);

		if (automaticTransportSelection && this.canDoRealtime) {
			// automatically shift between transport modes depending
			// on whether any peers are present (matching view if
			// applicable)
			const decideIfUpgrade = () => {
				if (switchoverTimeout) {
					clearTimeout(switchoverTimeout);
				}
				const hasPeers = this.presence.getViewPeers().length > 0;
				const shouldUpgrade =
					hasPeers ||
					(automaticTransportSelection !== 'peers-only' &&
						this.presence.selfReplicaIds.size > 1);
				if (shouldUpgrade && this.mode === 'pull') {
					this.setMode('realtime');
				} else if (!shouldUpgrade && this.mode === 'realtime') {
					// wait 1 second then switch to pull mode if still empty
					switchoverTimeout = setTimeout(() => {
						if (this.presence.getViewPeers().length === 0) {
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

		if (EXPERIMENTAL_backgroundSync) {
			attemptToRegisterBackgroundSync();
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

	get hasSynced() {
		return this._hasSynced;
	}

	private handleBroadcastChannelMessage = (event: MessageEvent) => {
		if (event.data.type === 'sync') {
			this.handleMessage(event.data.message, { source: 'broadcastChannel' });
		}
	};

	private handleMessage = async (
		message: ServerMessage,
		{ source }: { source: 'network' | 'broadcastChannel' } = {
			source: 'network',
		},
	) => {
		// cancel if client is shutting down
		if (this.ctx.closing) return;

		// TODO: move this into metadata
		if (message.type === 'op-re' || message.type === 'sync-resp') {
			for (const op of message.operations) {
				this.ctx.time.update(op.timestamp);
			}
		}

		this.ctx.log('debug', 'sync message', JSON.stringify(message, null, 2));
		switch (message.type) {
			case 'op-re':
				await this.onData({
					operations: message.operations,
					baselines: message.baselines,
				});
				if (message.globalAckTimestamp) {
					await this.ctx.meta.setGlobalAck(message.globalAckTimestamp);
				}
				break;
			case 'global-ack':
				await this.ctx.meta.setGlobalAck(message.timestamp);
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
					await this.ctx.meta.setGlobalAck(message.globalAckTimestamp);
				}

				await this.ctx.meta.updateLastSynced(message.ackedTimestamp);
				this._activelySyncing = false;
				this.emit('syncingChange', false);
				this._hasSynced = true;
				this.emit('synced');
				break;
			case 'need-since':
				this.emit('serverReset', message.since);
				this.ctx.files.onServerReset(message.since);
				this.activeSync.send(
					await this.ctx.meta.messageCreator.createSyncStep1(message.since),
				);
				break;
			case 'server-ack':
				await this.ctx.meta.updateLastSynced(message.timestamp);
		}

		// avoid rebroadcasting messages
		if (source === 'network') {
			this.broadcastChannel?.postMessage({
				type: 'sync',
				message,
			});
		}

		// update presence if necessary
		this.presence[HANDLE_MESSAGE](
			await this.ctx.meta.getLocalReplica(),
			message,
		);
	};
	private handleOnlineChange = async (online: boolean) => {
		this.emit('onlineChange', online);

		// if online, attempt to upload any unsynced files.
		if (online) {
			const unsyncedFiles = await this.ctx.files.listUnsynced();
			const results = await Promise.allSettled(
				unsyncedFiles.map((file) => this.fileSync.uploadFile(file)),
			);
			if (results.some((r) => r.status === 'rejected')) {
				this.ctx.log(
					'error',
					'Failed to upload unsynced files',
					results
						.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
						.map((r) => r.reason),
				);
			}
		}
	};
	private handlePresenceUpdate = async (data: {
		presence?: Presence;
		internal?: VerdantInternalPresence;
	}) => {
		this.send(await this.ctx.meta.messageCreator.createPresenceUpdate(data));
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
		this.ctx.log('debug', 'switching to', transport, 'mode');

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

	send = async (message: ClientMessage) => {
		if (this.activeSync.status === 'active') {
			// before sync, replace 'originator' authz subjects
			// with token userId. This is the easiest place to
			// do this and allows the rest of the system to be
			// ambivalent about user identity when assigning
			// authorization for the current user.
			const userId = this.endpointProvider.tokenInfo?.userId;
			if (!userId) {
				throw new VerdantError(
					VerdantError.Code.Unexpected,
					undefined,
					'Active sync has invalid token info',
				);
			}
			if (message.type === 'sync' || message.type === 'op') {
				rewriteAuthzOriginator(message, userId);
			}
			await this.activeSync.send(message);
			this.onOutgoingMessage?.(message);
		}
	};

	uploadFile = async (info: FileData) => {
		this.ctx.log('info', 'Uploading file', {
			name: info.name,
			type: info.type,
			id: info.id,
			size: info.file?.size,
		});
		if (this.activeSync.status === 'active') {
			return this.fileSync.uploadFile(info);
		} else {
			return {
				success: false,
				retry: false,
				error: 'Sync is not active',
			};
		}
	};

	getFile = async (id: string) => {
		// TODO: should this error? or just try anyway?
		if (this.activeSync.status === 'active') {
			return this.fileSync.getFile(id);
		} else {
			// wait for sync to start, up to 5 seconds
			await this.getSyncStartPromise();
			if (this.activeSync.status === 'paused') {
				throw new VerdantError(
					VerdantError.Code.Offline,
					undefined,
					'Sync is not active',
				);
			}
			return this.fileSync.getFile(id);
		}
	};

	private getSyncStartPromise = (timeout = 5000) => {
		return new Promise<void>((resolve, reject) => {
			const timeoutHandle = setTimeout(() => {
				reject(new Error('Sync did not start in time'));
				unsubscribe();
			}, timeout);
			const unsubscribe = this.subscribe('onlineChange', (online: boolean) => {
				if (online) {
					clearTimeout(timeoutHandle);
					unsubscribe();
					resolve();
				}
			});
		});
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

	/**
	 * Runs one isolated sync cycle over HTTP. This is useful for
	 * syncing via a periodic background job in a service worker,
	 * which keeps a client up to date while the app isn't open.
	 */
	public syncOnce = () => {
		return this.pushPullSync.syncOnce();
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
