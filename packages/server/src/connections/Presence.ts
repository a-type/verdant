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

export type PresenceStorageItem = UserInfo<any, any> & {
	expiresAt: number;
	/**
	 * Last time (ms) each of the user's replicas was seen.
	 */
	replicaLastSeen?: Record<string, number>;
};

export type PresenceStorageUpdate = UserInfoUpdate & {
	replicaLastSeen?: Record<string, number>;
};

export interface PresenceStorage {
	set: (
		userId: string,
		userInfo: PresenceStorageUpdate,
		profile: any,
		expiresAt: number,
	) => Promise<PresenceStorageItem>;
	setExpiresAt: (userId: string, expiresAt: number) => Promise<void>;
	get: (
		userId: string,
		time: number,
	) => Promise<PresenceStorageItem | undefined>;
	remove: (userId: string) => Promise<void>;
	all: () => Promise<Record<string, PresenceStorageItem>>;
	clear: () => Promise<void>;
}

const DEFAULT_EXPIRATION_TIME = 5 * 60 * 1000;
/**
 * Replicas which haven't sent a message (including heartbeats
 * and presence updates) within this window are no longer
 * considered active for their user.
 */
export const REPLICA_EXPIRATION_TIME = 2 * 60 * 1000;
const REPLICA_TOUCH_THROTTLE = 30 * 1000;

function pruneReplicas(
	replicaLastSeen: Record<string, number> | undefined,
	now: number,
) {
	const pruned: Record<string, number> = {};
	if (!replicaLastSeen) return pruned;
	for (const [replicaId, lastSeen] of Object.entries(replicaLastSeen)) {
		if (lastSeen > now - REPLICA_EXPIRATION_TIME) {
			pruned[replicaId] = lastSeen;
		}
	}
	return pruned;
}

function toUserInfo(
	item: PresenceStorageItem,
	now: number,
): UserInfo<any, any> {
	const { replicaLastSeen, expiresAt: _, ...userInfo } = item;
	const replicaIds = Object.keys(pruneReplicas(replicaLastSeen, now));
	if (replicaIds.length === 0) {
		replicaIds.push(userInfo.replicaId);
	}
	return { ...userInfo, replicaIds: replicaIds.sort() };
}

export class PresenceMemoryStorage implements PresenceStorage {
	private presences: Record<string, PresenceStorageItem> = {};

	set = async (
		userId: string,
		userInfo: PresenceStorageUpdate,
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
			Object.assign(this.presences[userId], userInfo, { expiresAt, profile });
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

	private lastTouched = new Map<string, Map<string, number>>();

	set = async (
		userId: string,
		userInfo: UserInfoUpdate,
	): Promise<UserInfo<any, any>> => {
		const now = Date.now();
		const existing = await this.storage.get(userId, now);
		const replicaLastSeen = pruneReplicas(existing?.replicaLastSeen, now);
		replicaLastSeen[userInfo.replicaId] = now;
		this.recordTouch(userId, userInfo.replicaId, now);
		const value = await this.storage.set(
			userId,
			{ ...userInfo, replicaLastSeen },
			await this.profiles.get(userId),
			now + DEFAULT_EXPIRATION_TIME,
		);

		return toUserInfo(value, now);
	};

	private recordTouch = (userId: string, replicaId: string, now: number) => {
		let userTouches = this.lastTouched.get(userId);
		if (!userTouches) {
			userTouches = new Map();
			this.lastTouched.set(userId, userTouches);
		}
		userTouches.set(replicaId, now);
	};

	/**
	 * Marks a replica as recently active for its user without
	 * changing the user's presence. Throttled to avoid a storage
	 * write per message. Does nothing if the user has no presence.
	 */
	touchReplica = async (userId: string, replicaId: string) => {
		const now = Date.now();
		const lastTouch = this.lastTouched.get(userId)?.get(replicaId);
		if (lastTouch && now - lastTouch < REPLICA_TOUCH_THROTTLE) return;
		const existing = await this.storage.get(userId, now);
		if (!existing) return;
		this.recordTouch(userId, replicaId, now);
		const replicaLastSeen = pruneReplicas(existing.replicaLastSeen, now);
		replicaLastSeen[replicaId] = now;
		await this.storage.set(
			userId,
			{
				id: existing.id,
				replicaId: existing.replicaId,
				presence: existing.presence,
				internal: existing.internal,
				replicaLastSeen,
			},
			existing.profile,
			now + DEFAULT_EXPIRATION_TIME,
		);
	};

	/**
	 * Removes one replica from a user's active replicas. Returns
	 * the updated user info, or undefined if the user has no
	 * presence or no other active replicas remain.
	 */
	removeReplica = async (
		userId: string,
		replicaId: string,
	): Promise<UserInfo<any, any> | undefined> => {
		this.lastTouched.get(userId)?.delete(replicaId);
		const now = Date.now();
		const existing = await this.storage.get(userId, now);
		if (!existing) return undefined;
		const replicaLastSeen = pruneReplicas(existing.replicaLastSeen, now);
		if (!(replicaId in replicaLastSeen)) return undefined;
		delete replicaLastSeen[replicaId];
		const remaining = Object.keys(replicaLastSeen);
		if (remaining.length === 0) return undefined;
		const value = await this.storage.set(
			userId,
			{
				id: existing.id,
				// point the user's primary replica at one which is still active
				replicaId:
					existing.replicaId === replicaId ? remaining[0] : existing.replicaId,
				presence: existing.presence,
				internal: existing.internal,
				replicaLastSeen,
			},
			existing.profile,
			existing.expiresAt,
		);
		return toUserInfo(value, now);
	};

	keepAlive = (userId: string, duration = DEFAULT_EXPIRATION_TIME) => {
		const time = Date.now() + duration;
		this.storage.setExpiresAt(userId, time);
	};

	get = async (userId: string) => {
		const now = Date.now();
		const value = await this.storage.get(userId, now);
		return value ? toUserInfo(value, now) : undefined;
	};

	remove = async (userId: string) => {
		this.lastTouched.delete(userId);
		await this.storage.remove(userId);
		this.emit('lost', userId);
	};

	all = async (): Promise<Record<string, UserInfo<any, any>>> => {
		const now = Date.now();
		const items = await this.storage.all();
		const result: Record<string, UserInfo<any, any>> = {};
		for (const [userId, item] of Object.entries(items)) {
			result[userId] = toUserInfo(item, now);
		}
		return result;
	};

	clear = () => {
		this.lastTouched.clear();
		this.storage.clear();
	};
}
