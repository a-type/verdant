import { CollectionIndexFilter, StorageSchema } from '@lo-fi/common';
import { Requeryable } from './Requeryable.js';
import { getRange } from './ranges.js';

interface BaseListParams {
	limit?: number;
	offset?: number;
}

interface BaseListQueryInit<T> {
	db: IDBDatabase;
	collection: string;
	schema: StorageSchema;
	index?: CollectionIndexFilter;
	hydrator: (oid: string) => Promise<T>;
	apply: (val: T, previous: T) => T;
}

class BaseListQuery<T> extends Requeryable<T[], BaseListParams> {
	constructor({
		db,
		collection,
		index,
		schema,
		hydrator,
	}: BaseListQueryInit<T>) {
		super({
			run: async (params: BaseListParams) => {
				const tx = db.transaction(collection, 'readonly');
				const store = tx.objectStore(collection);
				const range = getRange(schema, collection, index);
				const source = index ? store.index(index.where) : store;
				const direction = index?.order === 'desc' ? 'prev' : 'next';
				const request = source.openKeyCursor(range, direction);
				const result: string[] = [];
				// require an offset before reading if one was specified
				let hasOffset = !params.offset;

				const ids = await new Promise<string[]>((resolve, reject) => {
					request.onsuccess = (event) => {
						const cursor: IDBCursorWithValue | null = (
							event.target as IDBRequest
						).result;
						if (cursor) {
							if (!hasOffset) {
								cursor.advance(params.offset || 0);
								hasOffset = true;
							} else {
								result.push(cursor.primaryKey.toString());
								if (params.limit && result.length >= params.limit) {
									resolve(result);
								} else {
									cursor.continue();
								}
							}
						} else {
							resolve(result);
						}
					};

					request.onerror = (event) => {
						reject(event);
					};
				});

				return Promise.all(ids.map(hydrator));
			},
			initialResult: [],
		});
	}
}

export class PaginatedListQuery<T> {
	private query;

	get result() {
		return this.query.result;
	}

	get resolved() {
		return this.query.resolved;
	}

	constructor(init: Omit<BaseListQueryInit<T>, 'apply'>) {
		this.query = new BaseListQuery({
			...init,
			apply: (v) => v,
		});
	}
}
