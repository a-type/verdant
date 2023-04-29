import { createOid, hashObject, ObjectIdentifier } from '@lo-fi/common';
import { Context } from '../context.js';
import { storeRequestPromise } from '../idb.js';
import { Query } from './Query.js';

export interface QueryParams {
	collection: string;
	range: IDBKeyRange | IDBValidKey | undefined;
	index?: string;
	direction?: IDBCursorDirection;
	limit?: number;
	single?: boolean;
	write?: boolean;
}

export class QueryStore {
	private _disposed = false;
	constructor(
		private hydrator: (oid: ObjectIdentifier) => Promise<any>,
		private context: Context,
	) {}

	private getStore = (collection: string, write?: boolean) => {
		return this.context.documentDb
			.transaction(collection, write ? 'readwrite' : 'readonly')
			.objectStore(collection);
	};

	getQueryKey = ({ range, ...rest }: QueryParams) => {
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

	get = (params: {
		collection: string;
		range: IDBKeyRange | IDBValidKey | undefined;
		index?: string;
		direction?: IDBCursorDirection;
		limit?: number;
		single?: boolean;
		write?: boolean;
	}) => {
		const { collection, range, index, direction, limit, write, single } =
			params;
		const key = this.getQueryKey(params);

		if (single) {
			if (!range) throw new Error('Single object query requires a range value');
			const run = async () => {
				const store = this.getStore(collection, write);
				const source = index ? store.index(index) : store;
				const request = source.getKey(range);
				try {
					const key = await storeRequestPromise(request);
					// hackfix: avoid another db dip if already disposed
					if (this._disposed) {
						return null;
					}
					return key
						? await this.hydrator(createOid(collection, key.toString(), []))
						: null;
				} catch (error) {
					if (error instanceof Error && error.name === 'InvalidStateError') {
						this.context.log('Query failed with InvalidStateError', error);
						return null;
					} else {
						throw error;
					}
				}
			};
			return new Query(key, collection, run);
		} else {
			const run = async ({ offset }: { offset?: number }) => {
				const store = this.getStore(collection, write);
				const source = index ? store.index(index) : store;
				const request = source.openCursor(range, direction);
				try {
					let hasDoneOffset = !offset;
					const oids = await new Promise<ObjectIdentifier[]>(
						(resolve, reject) => {
							const result: any[] = [];
							request.onsuccess = async () => {
								const cursor = request.result;
								if (!hasDoneOffset && cursor && offset && limit) {
									cursor.advance(offset * limit);
									hasDoneOffset = true;
								} else {
									if (cursor?.primaryKey) {
										result.push(
											createOid(collection, cursor.primaryKey.toString(), []),
										);
										if (limit && result.length >= limit) {
											resolve(result);
										} else {
											cursor.continue();
										}
									} else {
										resolve(result);
									}
								}
							};
							request.onerror = () => reject(request.error);
						},
					);
					if (this._disposed) {
						// hackfix: avoid another db dip if already disposed.
						return [];
					}
					return Promise.all(oids.map((oid) => this.hydrator(oid)));
				} catch (error) {
					if (error instanceof Error && error.name === 'InvalidStateError') {
						this.context.log('Query failed with InvalidStateError', error);
						return [];
					} else {
						throw error;
					}
				}
			};
			return new Query<any[], { offset?: number }>(key, collection, run);
		}
	};

	dispose = () => {
		this._disposed = true;
	};

	setContext = (context: Context) => {
		this.context = context;
	};
}
