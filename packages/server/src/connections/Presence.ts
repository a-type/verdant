import {
	EventSubscriber,
	initialInternalPresence,
	UserInfo,
	UserInfoUpdate,
} from '@verdant-web/common';
import { UserProfiles } from '../Profiles.js';

export type PresenceEvents = {
	lost: (connectionKey: string, userId: string) => void;
};

/**
 * Stores client presence in-memory for connected
 * clients
 */
export class Presence extends EventSubscriber<PresenceEvents> {
	private presences: Record<string, UserInfo<any, any>> = {};
	private connectionToUser: Record<string, string> = {};
	private userToConnection: Record<string, Set<string>> = {};
	private keepalives = new Map<string, NodeJS.Timeout>();

	constructor(private profiles: UserProfiles<any>) {
		super();
	}

	set = async (
		connectionKey: string,
		userId: string,
		userInfo: UserInfoUpdate,
	) => {
		if (!this.presences[userId]) {
			this.presences[userId] = {
				...userInfo,
				profile: await this.profiles.get(userId),
				internal: userInfo.internal || initialInternalPresence,
			};
		} else {
			Object.assign(this.presences[userId], userInfo);
		}
		this.connectionToUser[connectionKey] = userId;
		this.userToConnection[userId] =
			this.userToConnection[userId] || new Set<string>();
		this.userToConnection[userId].add(connectionKey);

		this.keepAlive(connectionKey);

		return this.presences[userId]!;
	};

	keepAlive = (connectionKey: string) => {
		const existing = this.keepalives.get(connectionKey);
		if (existing) {
			clearTimeout(existing);
		}

		this.keepalives.set(
			connectionKey,
			setTimeout(() => {
				this.removeConnection(connectionKey);
				this.keepalives.delete(connectionKey);
			}, 30 * 1000),
		);
	};

	get = (userId: string) => {
		return this.presences[userId];
	};

	removeConnection = (connectionKey: string) => {
		const userId = this.connectionToUser[connectionKey];
		if (!userId) return;

		this.userToConnection[userId].delete(connectionKey);
		if (this.userToConnection[userId].size === 0) {
			delete this.presences[userId];
			this.emit('lost', connectionKey, userId);

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
		this.connectionToUser = {};
		this.userToConnection = {};
	};
}
