import { ServerMessage, EventSubscriber } from '@lo-fi/common';
import type { Presence, UserInfo } from './index.js';
import { LocalReplicaInfo } from './metadata/LocalReplicaStore.js';

export class PresenceManager extends EventSubscriber<{
	peerChanged: (userId: string, presence: any) => void;
	selfChanged: (presence: any) => void;
	peersChanged: (peers: Record<string, any>) => void;
	update: (presence: any) => void;
}> {
	private _peers = {} as Record<string, UserInfo>;
	private _self = { profile: {} } as UserInfo;
	private _peerIds = new Array<string>();

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

	constructor(initialPresence?: Presence) {
		super();
		if (initialPresence) {
			this.self.presence = initialPresence;
		}
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
			delete this._peers[message.userId];
			peersChanged = true;
		}
		if (peersChanged) {
			this._peerIds = Array.from(peerIdsSet);
			this.emit('peersChanged', this._peers);
		}
	};

	update = async (presence: Partial<Presence>) => {
		this.emit('update', {
			...this.self.presence,
			...presence,
		});
	};
}
