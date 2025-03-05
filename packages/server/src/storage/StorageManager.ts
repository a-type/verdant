import { Storage, StorageFactory } from './Storage.js';

export class StorageManager {
	private _cache: Map<string, Promise<Storage>> = new Map();
	private _evicts: Map<string, NodeJS.Timeout> = new Map();

	constructor(private _factory: StorageFactory) {}

	open = async (libraryId: string) => {
		let storage = this._cache.get(libraryId);
		if (!storage) {
			storage = this._factory(libraryId);
			this._cache.set(libraryId, storage);
		}
		this.refresh(libraryId);
		await storage;
		return storage;
	};

	closeAll = async () => {
		for (const [libraryId, storage] of this._cache) {
			await (await storage).close();
			this.evict(libraryId);
		}
	};

	private refresh = (libraryId: string) => {
		clearTimeout(this._evicts.get(libraryId));
		this._evicts.set(
			libraryId,
			setTimeout(this.evict, 1000 * 60 * 60, libraryId),
		);
	};

	private evict = (libraryId: string) => {
		this._cache.delete(libraryId);
		this._evicts.delete(libraryId);
	};
}
