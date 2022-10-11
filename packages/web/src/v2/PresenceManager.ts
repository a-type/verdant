import { ServerMessage, EventSubscriber } from '@lofi-db/common';
import { Metadata } from './Metadata.js';
import { Sync } from './Sync.js';
import type { Presence, Profile, UserInfo } from '../index.js';

export class PresenceManager<Profile, Presence> extends EventSubscriber<{
	peerChanged: (userId: string, presence: any) => void;
	selfChanged: (presence: any) => void;
	peersChanged: (peers: Record<string, any>) => void;
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

	constructor(private sync: Sync, private meta: Metadata) {
		super();
		this.sync.subscribe('message', this.onMessage);
	}

	private onMessage = async (message: ServerMessage) => {
		const localReplicaInfo = await this.meta.localReplica.get();

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
		this.sync.send(
			await this.meta.messageCreator.createPresenceUpdate({
				...this.self.presence,
				...presence,
			}),
		);
	};
}
