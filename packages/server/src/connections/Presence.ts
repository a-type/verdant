import {
	EventSubscriber,
	initialInternalPresence,
	UserInfo,
	UserInfoUpdate,
} from '@verdant-web/common';
import { UserProfiles } from '../Profiles.js';

export type PresenceEvents = {
	lost: (userId: string) => void;
};

export type PresenceStorageItem = UserInfo<any, any> & { expiresAt: number };

export interface PresenceStorage {
	set: (
		userId: string,
		userInfo: UserInfoUpdate,
		profile: any,
		expiresAt: number,
	) => Promise<UserInfo<any, any>>;
	setExpiresAt: (userId: string, expiresAt: number) => Promise<void>;
	get: (
		userId: string,
		time: number,
	) => Promise<UserInfo<any, any> | undefined>;
	remove: (userId: string) => Promise<void>;
	all: () => Promise<Record<string, UserInfo<any, any>>>;
	clear: () => Promise<void>;
}

const DEFAULT_EXPIRATION_TIME = 60 * 1000;

export class PresenceMemoryStorage implements PresenceStorage {
	private presences: Record<string, PresenceStorageItem> = {};

	set = async (
		userId: string,
		userInfo: UserInfoUpdate,
		profile: any,
		expiresAt: number,
	) => {
		if (!this.presences[userId]) {
			this.presences[userId] = {
				...userInfo,
				expiresAt,
				profile,
				internal: userInfo.internal || initialInternalPresence,
			};
		} else {
			Object.assign(this.presences[userId], userInfo);
		}
		return this.presences[userId]!;
	};

	setExpiresAt = async (userId: string, expiresAt: number) => {
		const presence = this.presences[userId];
		if (presence) {
			presence.expiresAt = expiresAt;
		}
	};

	get = async (userId: string, time: number) => {
		const value = this.presences[userId];
		if (value && value.expiresAt > time) {
			return value;
		}
		return undefined;
	};

	remove = async (userId: string) => {
		delete this.presences[userId];
		if (Object.keys(this.presences).length === 0) {
			this.clear();
		}
	};

	all = async () => {
		return this.presences;
	};

	clear = async () => {
		this.presences = {};
	};
}

/**
 * Stores client presence for connected
 * clients
 */
export class Presence extends EventSubscriber<PresenceEvents> {
	constructor(
		readonly profiles: UserProfiles<any>,
		readonly storage: PresenceStorage = new PresenceMemoryStorage(),
	) {
		super();
	}

	set = async (userId: string, userInfo: UserInfoUpdate) => {
		const value = await this.storage.set(
			userId,
			userInfo,
			await this.profiles.get(userId),
			Date.now() + DEFAULT_EXPIRATION_TIME,
		);

		return value;
	};

	keepAlive = (userId: string, duration = DEFAULT_EXPIRATION_TIME) => {
		const time = Date.now() + duration;
		this.storage.setExpiresAt(userId, time);
	};

	get = (userId: string) => {
		return this.storage.get(userId, Date.now());
	};

	remove = async (userId: string) => {
		await this.storage.remove(userId);
		this.emit('lost', userId);
	};

	all = () => {
		return this.storage.all();
	};

	clear = () => {
		this.storage.clear();
	};
}
