import { CollectionIndexFilter, StorageSchema } from '@lo-fi/common';
import { Requeryable } from './Requeryable.js';
import { getRange } from './ranges.js';
import { ObjectEntity } from '../index.js';

interface BaseListParams {
	offset?: number;
}

interface BaseListQueryInit<T> {
	db: IDBDatabase;
	collection: string;
	schema: StorageSchema;
	index?: CollectionIndexFilter;
	hydrator: (oid: string) => Promise<T>;
	apply: (val: T, previous: T) => T;
	pageSize: number;
}

class BaseListQuery<T> extends Requeryable<T[], BaseListParams> {
	constructor({
		db,
		collection,
		index,
		schema,
		pageSize,
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
								if (pageSize && result.length >= pageSize) {
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

class ListQueryWrapper<T> {
	protected query;

	get result() {
		return this.query.result;
	}

	get resolved() {
		return this.query.resolved;
	}

	constructor(init: BaseListQueryInit<T>) {
		this.query = new BaseListQuery(init);
	}
}

export class PaginatedListQuery<
	T extends ObjectEntity<any, any>[],
> extends ListQueryWrapper<T> {
	constructor(init: Omit<BaseListQueryInit<T>, 'apply'>) {
		super({
			...init,
			apply: (v) => v,
		});
	}
}

export class InfiniteListQuery<
	T extends ObjectEntity<any, any>[],
> extends ListQueryWrapper<T> {
	constructor(init: Omit<BaseListQueryInit<T>, 'apply'>) {
		super({
			...init,
			apply: (val, previous) => previous.concat(val) as T,
		});
	}
}

export class CompleteListQuery<
	T extends ObjectEntity<any, any>[],
> extends ListQueryWrapper<T> {
	constructor(init: Omit<BaseListQueryInit<T>, 'apply' | 'pageSize'>) {
		super({
			...init,
			pageSize: 0,
			apply: (val) => val,
		});
	}
}
