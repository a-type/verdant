import { ServerMessage, EventSubscriber, Batcher } from '@lo-fi/common';
import type { UserInfo } from './index.js';
import { LocalReplicaInfo } from './metadata/LocalReplicaStore.js';

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
	private _peerIds = new Array<string>();
	private _updateBatcher;

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

		this._updateBatcher = new Batcher(this.flushPresenceUpdates, {
			max: 25,
			timeout: updateBatchTimeout,
		});
	}

	__handleMessage = async (
		localReplicaInfo: LocalReplicaInfo,
		message: ServerMessage,
	) => {
		let peersChanged = false;
		const peerIdsSet = new Set<string>(this.peerIds);

		if (message.type === 'presence-changed') {
			if (message.userInfo.replicaId === localReplicaInfo.id) {
				this._self = message.userInfo;
				this.emit('selfChanged', message.userInfo);
			} else {
				peerIdsSet.add(message.userInfo.id);
				this._peers[message.userInfo.id] = message.userInfo;
				peersChanged = true;
				this.emit('peerChanged', message.userInfo.id, message.userInfo);
			}
		} else if (message.type === 'sync-resp') {
			for (const [id, presence] of Object.entries(message.peerPresence)) {
				if (presence.replicaId === localReplicaInfo.id) {
					this._self = presence;
					this.emit('selfChanged', presence);
				} else {
					peersChanged = true;
					peerIdsSet.add(id);
					this._peers[id] = presence;
					this.emit('peerChanged', id, presence);
				}
			}
		} else if (message.type === 'presence-offline') {
			peerIdsSet.delete(message.userId);
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
		this._updateBatcher.add('default', presence);
	};

	flushPresenceUpdates = (presenceUpdates: Partial<Presence>[]) => {
		const presence = presenceUpdates.reduce((acc, update) => {
			return { ...acc, ...update };
		}, this.self.presence);
		this.emit('update', presence);
	};
}
