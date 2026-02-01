import {
	initialInternalPresence,
	UserInfo,
	UserInfoUpdate,
} from '@verdant-web/common';
import {
	Logger,
	PresenceStorage,
	PresenceStorageItem,
} from '@verdant-web/server/internals';

export class DurableObjectPresenceStorage implements PresenceStorage {
	private key;
	private log;

	constructor(
		private ctx: DurableObjectState,
		{
			storageKey = 'presence-storage',
			log,
		}: {
			storageKey?: string;
			log?: Logger;
		} = {},
	) {
		this.key = storageKey;
		this.log = log;
	}

	private getMap = async (): Promise<Record<string, PresenceStorageItem>> => {
		const map: Record<string, PresenceStorageItem> | null =
			(await this.ctx.storage.get(this.key)) ?? {};
		// clear entries that have expired
		const now = Date.now();
		for (const [userId, item] of Object.entries(map)) {
			if (item.expiresAt <= now) {
				delete map[userId];
				this.log?.(
					'debug',
					`Presence for user ${userId} has expired and was removed.`,
				);
			}
		}
		return map;
	};

	set = async (
		userId: string,
		userInfo: UserInfoUpdate,
		profile: any,
		expiresAt: number,
	) => {
		const map = await this.getMap();
		const existing = map[userId];
		const newValue: PresenceStorageItem = existing
			? { ...existing, ...userInfo, expiresAt, profile }
			: {
					...userInfo,
					expiresAt,
					profile,
					internal: userInfo.internal || initialInternalPresence,
				};

		await this.ctx.storage.put(this.key, {
			...map,
			[userId]: newValue,
		});
		return newValue;
	};

	get = async (userId: string, time: number) => {
		const map = await this.getMap();
		const value = map[userId];
		if (value && value.expiresAt > time) {
			return value;
		}
		return undefined;
	};

	all: () => Promise<Record<string, UserInfo<any, any>>> = () => {
		return this.getMap();
	};

	clear = async () => {
		await this.ctx.storage.delete(this.key);
	};

	remove = async (userId: string) => {
		const map = await this.getMap();
		delete map[userId];
		await this.ctx.storage.put(this.key, map);
	};

	setExpiresAt: (userId: string, expiresAt: number) => Promise<void> = async (
		userId,
		expiresAt,
	) => {
		const map = await this.getMap();
		const existing = map[userId];
		if (existing) {
			map[userId] = {
				...existing,
				expiresAt,
			};
			await this.ctx.storage.put(this.key, map);
		}
	};
}
