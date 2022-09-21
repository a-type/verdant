export interface UserProfiles<Profile> {
	get(userId: string): Promise<Profile>;
}

export class UserProfileLoader<Profile> {
	private cache = new Map<string, Promise<Profile>>();

	constructor(private source: UserProfiles<Profile>) {}

	get = async (userId: string) => {
		if (!this.cache.has(userId)) {
			this.cache.set(userId, this.source.get(userId));
		}

		return this.cache.get(userId)!;
	};

	evict = (userId: string) => {
		this.cache.delete(userId);
	};
}
