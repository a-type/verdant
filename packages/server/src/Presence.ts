import { UserInfo } from '@lo-fi/common';
import EventEmitter from 'events';

/**
 * Stores client presence in-memory for connected
 * clients
 */
export class Presence extends EventEmitter {
	private presences: Record<string, UserInfo<any, any>> = {};
	// maps replicaId -> userId
	private replicaToUser: Record<string, string> = {};
	// there's definitely a more efficient way to do this, oh well
	private userToReplica: Record<string, Set<string>> = {};

	set = (userId: string, presence: UserInfo<any, any>) => {
		this.presences[userId] = presence;
		this.replicaToUser[presence.replicaId] = userId;
		this.userToReplica[userId] =
			this.userToReplica[userId] || new Set<string>();
		this.userToReplica[userId].add(presence.replicaId);
	};

	removeReplica = (replicaId: string) => {
		const userId = this.replicaToUser[replicaId];
		if (!userId) return;

		this.userToReplica[userId].delete(replicaId);
		if (this.userToReplica[userId].size === 0) {
			delete this.presences[userId];
			this.emit('lost', replicaId, userId);
		}
	};

	all = () => {
		return this.presences;
	};

	clear = () => {
		this.presences = {};
		this.replicaToUser = {};
		this.userToReplica = {};
	};
}
