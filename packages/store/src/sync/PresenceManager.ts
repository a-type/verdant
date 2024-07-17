import {
	ServerMessage,
	EventSubscriber,
	Batcher,
	Batch,
	VerdantInternalPresence,
	initialInternalPresence,
} from '@verdant-web/common';
import type { UserInfo } from '../index.js';
import {
	LocalReplicaInfo,
	LocalReplicaStore,
} from '../metadata/LocalReplicaStore.js';

export const HANDLE_MESSAGE = Symbol('handleMessage');

export class PresenceManager<
	Profile = any,
	Presence = any,
> extends EventSubscriber<{
	/**
	 * Fired when a particular peer's presence changes
	 */
	peerChanged: (userId: string, presence: UserInfo<Profile, Presence>) => void;
	/**
	 * Fired immediately when a change to local presence is made. This change may not
	 * yet have been sent to the server (see: "update" event)
	 */
	selfChanged: (presence: UserInfo<Profile, Presence>) => void;
	/** Fired when any number of peer presences have changed */
	peersChanged: (peers: Record<string, UserInfo<Profile, Presence>>) => void;
	/** Fired when a peer presence goes offline */
	peerLeft: (userId: string, lastPresence: UserInfo<Profile, Presence>) => void;
	/** Fired after local presence changes are flushed to the server. */
	update: (data: {
		presence?: Presence;
		internal?: VerdantInternalPresence;
	}) => void;
	load: () => void;
	/** Fired on any change to a peer or the local user */
	change: () => void;
}> {
	private _peers = {} as Record<string, UserInfo<Profile, Presence>>;
	private _self = { profile: {} } as UserInfo<Profile, Presence>;
	// keep track of own replica IDs - applications may care if we're "alone" but with multiple devices.
	private _selfReplicaIds = new Set<string>();
	private _peerIds = new Array<string>();
	private _updateBatcher;
	private _updateBatch: Batch<{
		presence?: Partial<Presence>;
		internal?: Partial<VerdantInternalPresence>;
	}>;

	get self() {
		return this._self;
	}

	get peers() {
		return this._peers;
	}

	get peerIds() {
		return this._peerIds;
	}

	get everyone() {
		const everyone = { ...this._peers };
		everyone[this.self.id] = this.self;
		return everyone;
	}

	get selfReplicaIds() {
		return this._selfReplicaIds;
	}

	constructor({
		initialPresence,
		updateBatchTimeout = 200,
		defaultProfile,
		replicaStore,
	}: {
		initialPresence: Presence;
		defaultProfile: Profile;
		updateBatchTimeout?: number;
		replicaStore: LocalReplicaStore;
	}) {
		super();
		this.self.presence = initialPresence;
		this.self.profile = defaultProfile;
		this.self.internal = initialInternalPresence;
		this.self.id = '';
		this.self.replicaId = '';

		// set the local replica ID as soon as it's loaded
		replicaStore.get().then((info) => {
			this.self.replicaId = info.id;
		});

		this._updateBatcher = new Batcher(this.flushPresenceUpdates);
		this._updateBatch = this._updateBatcher.add({
			max: 25,
			timeout: updateBatchTimeout,
			items: [],
			key: 'default',
		});
	}

	/**
	 * Decides if an update is for the local user or not. Even if it's a different replica
	 * than the local one.
	 *
	 * If the replicaId matches, we use that first - we may not know the local replica's User ID yet,
	 * e.g. on the first presence update.
	 *
	 * Otherwise, match the user ID to our local copy.
	 */
	private isSelf = (
		localReplicaInfo: LocalReplicaInfo,
		userInfo: UserInfo<Profile, Presence>,
	) => {
		return (
			localReplicaInfo.id === userInfo.replicaId ||
			this._selfReplicaIds.has(userInfo.replicaId) ||
			this._self.id === userInfo.id
		);
	};

	[HANDLE_MESSAGE] = async (
		localReplicaInfo: LocalReplicaInfo,
		message: ServerMessage,
	) => {
		let peersChanged = false;
		let selfChanged = false;
		const peerIdsSet = new Set<string>(this.peerIds);

		if (message.type === 'presence-changed') {
			if (this.isSelf(localReplicaInfo, message.userInfo)) {
				this._self = message.userInfo;
				this._selfReplicaIds.add(message.userInfo.replicaId);
				selfChanged = true;
				this.emit('selfChanged', message.userInfo);
			} else {
				peerIdsSet.add(message.userInfo.id);
				this._peers[message.userInfo.id] = message.userInfo;
				peersChanged = true;
				this.emit('peerChanged', message.userInfo.id, message.userInfo);
			}
		} else if (message.type === 'sync-resp') {
			// reset to provided presence data, which includes all peers.
			this._peers = {};
			peerIdsSet.clear();

			for (const [id, userInfo] of Object.entries(message.peerPresence)) {
				if (this.isSelf(localReplicaInfo, userInfo)) {
					this._self = userInfo;
					this._selfReplicaIds.add(userInfo.replicaId);
					selfChanged = true;
					this.emit('selfChanged', userInfo);
				} else {
					peersChanged = true;
					peerIdsSet.add(id);
					this._peers[id] = userInfo;
					this.emit('peerChanged', id, userInfo);
				}
			}
		} else if (message.type === 'presence-offline') {
			peerIdsSet.delete(message.userId);
			this._selfReplicaIds.delete(message.replicaId);
			const lastPresence = this._peers[message.userId];
			delete this._peers[message.userId];
			peersChanged = true;
			this.emit('peerLeft', message.userId, lastPresence);
		}
		if (peersChanged) {
			this._peerIds = Array.from(peerIdsSet);
			this.emit('peersChanged', this._peers);
		}
		if (peersChanged || selfChanged) {
			this.emit('change');
		}
	};

	update = async (presence: Partial<Presence>) => {
		this._updateBatch.update({
			items: [{ presence }],
		});
		// proactively update the local presence
		this.self.presence = { ...this.self.presence, ...presence };
		this.emit('selfChanged', this.self);
		this.emit('change');
	};

	flushPresenceUpdates = (
		presenceUpdates: {
			presence?: Partial<Presence>;
			internal?: Partial<VerdantInternalPresence>;
		}[],
	) => {
		const data = {
			presence: this.self.presence,
			internal: this.self.internal,
		};
		for (const update of presenceUpdates) {
			if (update.presence) {
				Object.assign(data.presence as any, update.presence);
			}
			if (update.internal) {
				Object.assign(data.internal, update.internal);
			}
		}
		this.emit('update', data);
	};

	setViewId = (viewId: string | undefined) => {
		this._updateBatch.update({
			items: [{ internal: { viewId } }],
		});
		this.self.internal.viewId = viewId;
		this.emit('selfChanged', this.self);
		this.emit('change');
	};

	/**
	 * Get all peers that are in the same view as the local user.
	 */
	getViewPeers = () => {
		return (
			this._peerIds
				.map((id) => this._peers[id])
				// undefined view matches all peers. otherwise,
				// filter to only those in the same view.
				.filter(
					(peer) =>
						this.self.internal.viewId === undefined ||
						peer.internal.viewId === this.self.internal.viewId,
				)
		);
	};
}
