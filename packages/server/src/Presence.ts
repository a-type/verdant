import {
	initialInternalPresence,
	UserInfo,
	UserInfoUpdate,
} from '@verdant-web/common';
import EventEmitter from 'events';
import { UserProfiles } from './Profiles.js';

/**
 * Stores client presence in-memory for connected
 * clients
 */
export class Presence extends EventEmitter {
	private presences: Map<
		string,
		{
			presences: Record<string, UserInfo<any, any>>;
			replicaToUser: Record<string, string>;
			userToReplica: Record<string, Set<string>>;
		}
	> = new Map();

	constructor(private profiles: UserProfiles<any>) {
		super();
	}

	private getLibrary = (libraryId: string) => {
		let map = this.presences.get(libraryId);
		if (!map) {
			map = {
				presences: {},
				replicaToUser: {},
				userToReplica: {},
			};
			this.presences.set(libraryId, map);
		}
		return map;
	};

	set = async (libraryId: string, userId: string, userInfo: UserInfoUpdate) => {
		const lib = this.getLibrary(libraryId);
		if (!lib.presences[userId]) {
			lib.presences[userId] = {
				...userInfo,
				profile: await this.profiles.get(userId),
				internal: userInfo.internal || initialInternalPresence,
			};
		} else {
			Object.assign(lib.presences[userId], userInfo);
		}
		lib.replicaToUser[userInfo.replicaId] = userId;
		lib.userToReplica[userId] = lib.userToReplica[userId] || new Set<string>();
		lib.userToReplica[userId].add(userInfo.replicaId);

		return lib.presences[userId]!;
	};

	get = (libraryId: string, userId: string) => {
		return this.presences.get(libraryId)?.presences[userId];
	};

	removeReplica = (libraryId: string, replicaId: string) => {
		const lib = this.getLibrary(libraryId);
		const userId = lib.replicaToUser[replicaId];
		if (!userId) return;

		lib.userToReplica[userId].delete(replicaId);
		if (lib.userToReplica[userId].size === 0) {
			delete lib.presences[userId];
			this.emit('lost', libraryId, replicaId, userId);

			// memory cleanup
			if (Object.keys(lib.presences).length === 0) {
				this.clear(libraryId);
			}
		}
	};

	all = (libraryId: string) => {
		return this.presences.get(libraryId)?.presences || {};
	};

	clear = (libraryId: string) => {
		this.presences.delete(libraryId);
	};
}
