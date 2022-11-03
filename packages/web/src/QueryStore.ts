import { hashObject } from '@lo-fi/common';
import { storeRequestPromise } from './idb.js';
import { EntityStore } from './EntityStore.js';
import { Query, UPDATE } from './Query.js';

export class QueryStore {
	private cache = new Map<string, Query<any>>();

	constructor(private db: IDBDatabase, private entities: EntityStore) {
		this.entities.subscribe('collectionsChanged', this.onCollectionsChanged);
	}

	private getStore = (collection: string, write?: boolean) => {
		return this.db
			.transaction(collection, write ? 'readwrite' : 'readonly')
			.objectStore(collection);
	};

	private getQueryKey = ({
		range,
		...rest
	}: {
		collection: string;
		range: IDBKeyRange | IDBValidKey | undefined;
		index?: string;
		direction?: IDBCursorDirection;
		limit?: number;
		single?: boolean;
		write?: boolean;
	}) => {
		let hashedRange;
		if (range instanceof IDBKeyRange) {
			hashedRange = hashObject({
				includes: range.includes,
				lower: range.lower,
				lowerOpen: range.lowerOpen,
				upper: range.upper,
				upperOpen: range.upperOpen,
			});
		} else {
			hashedRange = range;
		}
		return hashObject({ range: hashedRange, ...rest });
	};

	get = (config: {
		collection: string;
		range: IDBKeyRange | IDBValidKey | undefined;
		index?: string;
		direction?: IDBCursorDirection;
		limit?: number;
		single?: boolean;
		write?: boolean;
	}) => {
		const { collection, range, index, direction, limit, write, single } =
			config;
		const key = this.getQueryKey(config);
		if (this.cache.has(key)) {
			return this.cache.get(key)!;
		}

		let run: () => Promise<any>;
		if (single) {
			if (!range) throw new Error('Single object query requires a range value');
			run = async () => {
				const store = this.getStore(collection, write);
				const source = index ? store.index(index) : store;
				const request = source.get(range);
				const view = await storeRequestPromise(request);
				return view ? this.entities.get(view) : null;
			};
		} else {
			run = () => {
				const store = this.getStore(collection, write);
				const source = index ? store.index(index) : store;
				const request = source.openCursor(range, direction);
				return new Promise((resolve, reject) => {
					const result: any[] = [];
					request.onsuccess = () => {
						const cursor = request.result;
						if (cursor) {
							result.push(this.entities.get(cursor.value));
							if (limit && result.length >= limit) {
								resolve(result);
							} else {
								cursor.continue();
							}
						} else {
							resolve(result);
						}
					};
					request.onerror = () => reject(request.error);
				});
			};
		}
		const query = new Query(
			key,
			collection,
			run,
			(query) => {
				const cached = this.cache.get(key);
				if (cached && cached !== query) {
					console.warn(
						'Query already exists in cache for key',
						key,
						', this is not an error but suggests your code is creating multiple queries of the same type in the same frame and subscribing to them, and will produce less efficient memory usage.',
					);
				}
				this.cache.set(key, query);
			},
			(query) => {
				this.prepareToCleanupQuery(query);
			},
		);
		this.cache.set(key, query);
		this.prepareToCleanupQuery(query);
		return query;
	};

	/**
	 * If a query is unsubscribed after 1 tick, it is removed from the cache.
	 * To persist a query in the cache a user must subscribe to it.
	 */
	private prepareToCleanupQuery = (query: Query<any>) => {
		setTimeout(() => {
			if (!query.isActive) {
				const cached = this.cache.get(query.key);
				if (cached === query) {
					this.cache.delete(query.key);
				}
			}
		}, 100);
	};

	update = (key: string) => {
		this.cache.get(key)?.[UPDATE]();
	};

	private onCollectionsChanged = (collections: string[]) => {
		let updated = 0;
		// FIXME: This is a naive implementation, improve beyond O(n)
		for (const [key, query] of this.cache) {
			if (collections.includes(query.collection)) {
				query[UPDATE]();
				updated++;
			}
		}
	};

	destroy = () => {
		for (const query of this.cache.values()) {
			query.dispose();
		}
		this.cache.clear();
	};
}
