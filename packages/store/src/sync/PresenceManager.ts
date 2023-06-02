import {
	ServerMessage,
	EventSubscriber,
	Batcher,
	Batch,
} from '@verdant-web/common';
import type { UserInfo } from '../index.js';
import { LocalReplicaInfo } from '../metadata/LocalReplicaStore.js';

export const HANDLE_MESSAGE = Symbol('handleMessage');

export class PresenceManager<
	Profile = any,
	Presence = any,
> extends EventSubscriber<{
	peerChanged: (userId: string, presence: UserInfo<Profile, Presence>) => void;
	selfChanged: (presence: UserInfo<Profile, Presence>) => void;
	peersChanged: (peers: Record<string, any>) => void;
	peerLeft: (userId: string, lastPresence: UserInfo<Profile, Presence>) => void;
	update: (presence: Partial<Presence>) => void;
}> {
	private _peers = {} as Record<string, UserInfo<Profile, Presence>>;
	private _self = { profile: {} } as UserInfo<Profile, Presence>;
	// keep track of own replica IDs - applications may care if we're "alone" but with multiple devices.
	private _selfReplicaIds = new Set<string>();
	private _peerIds = new Array<string>();
	private _updateBatcher;
	private _updateBatch: Batch<Partial<Presence>>;

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
	}: {
		initialPresence: Presence;
		defaultProfile: Profile;
		updateBatchTimeout?: number;
	}) {
		super();
		this.self.presence = initialPresence;
		this.self.profile = defaultProfile;

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
		const peerIdsSet = new Set<string>(this.peerIds);

		if (message.type === 'presence-changed') {
			if (this.isSelf(localReplicaInfo, message.userInfo)) {
				this._self = message.userInfo;
				this._selfReplicaIds.add(message.userInfo.replicaId);
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
	};

	update = async (presence: Partial<Presence>) => {
		this._updateBatch.update({
			items: [presence],
		});
		// proactively update the local presence
		this.self.presence = { ...this.self.presence, ...presence };
		this.emit('selfChanged', this.self);
	};

	flushPresenceUpdates = (presenceUpdates: Partial<Presence>[]) => {
		const presence = presenceUpdates.reduce((acc, update) => {
			return { ...acc, ...update };
		}, this.self.presence);
		this.emit('update', presence);
	};
}
