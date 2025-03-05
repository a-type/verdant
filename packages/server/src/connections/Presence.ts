import {
	EventSubscriber,
	initialInternalPresence,
	UserInfo,
	UserInfoUpdate,
} from '@verdant-web/common';
import { UserProfiles } from '../Profiles.js';

export type PresenceEvents = {
	lost: (replicaId: string, userId: string) => void;
};

export interface IPresence extends EventSubscriber<PresenceEvents> {
	set: (
		userId: string,
		userInfo: UserInfoUpdate,
	) => Promise<UserInfo<any, any>>;
	get: (userId: string) => UserInfo<any, any> | undefined;
	removeReplica: (replicaId: string) => void;
	all: () => Record<string, UserInfo<any, any>>;
	clear: () => void;
}

/**
 * Stores client presence in-memory for connected
 * clients
 */
export class Presence extends EventSubscriber<PresenceEvents> {
	private presences: Record<string, UserInfo<any, any>> = {};
	private replicaToUser: Record<string, string> = {};
	private userToReplica: Record<string, Set<string>> = {};
	private keepalives = new Map<string, NodeJS.Timeout>();

	constructor(private profiles: UserProfiles<any>) {
		super();
	}

	set = async (userId: string, userInfo: UserInfoUpdate) => {
		if (!this.presences[userId]) {
			this.presences[userId] = {
				...userInfo,
				profile: await this.profiles.get(userId),
				internal: userInfo.internal || initialInternalPresence,
			};
		} else {
			Object.assign(this.presences[userId], userInfo);
		}
		this.replicaToUser[userInfo.replicaId] = userId;
		this.userToReplica[userId] =
			this.userToReplica[userId] || new Set<string>();
		this.userToReplica[userId].add(userInfo.replicaId);

		this.keepAlive(userInfo.replicaId);

		return this.presences[userId]!;
	};

	keepAlive = (replicaId: string) => {
		const existing = this.keepalives.get(replicaId);
		if (existing) {
			clearTimeout(existing);
		}

		this.keepalives.set(
			replicaId,
			setTimeout(() => {
				this.removeReplica(replicaId);
				this.keepalives.delete(replicaId);
			}, 30 * 1000),
		);
	};

	get = (userId: string) => {
		return this.presences[userId];
	};

	removeReplica = (replicaId: string) => {
		const userId = this.replicaToUser[replicaId];
		if (!userId) return;

		this.userToReplica[userId].delete(replicaId);
		if (this.userToReplica[userId].size === 0) {
			delete this.presences[userId];
			this.emit('lost', replicaId, userId);

			// memory cleanup
			if (Object.keys(this.presences).length === 0) {
				this.clear();
			}
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
