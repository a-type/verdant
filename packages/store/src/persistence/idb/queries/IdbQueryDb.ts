import {
	CollectionFilter,
	createOid,
	decomposeOid,
	getIndexValues,
	ObjectIdentifier,
} from '@verdant-web/common';
import { Context } from '../../../context/context.js';
import {
	AbstractTransaction,
	CommonQueryOptions,
	PersistenceQueryDb,
	QueryMode,
} from '../../interfaces.js';
import { IdbService } from '../IdbService.js';
import { getRange } from './ranges.js';
import { closeDatabase, getSizeOfObjectStore, isAbortError } from '../util.js';

export class IdbQueryDb extends IdbService implements PersistenceQueryDb {
	private ctx;
	constructor(db: IDBDatabase, context: Omit<Context, 'queries' | 'files'>) {
		super(db, { log: context.log });
		this.ctx = context;
	}

	stats = async (): Promise<
		Record<string, { count: number; size: number }>
	> => {
		const collectionNames = Object.keys(this.ctx.schema.collections);
		const collections: Record<string, { count: number; size: number }> = {};
		await Promise.all(
			collectionNames.map(async (name) => {
				const size = await getSizeOfObjectStore(this.db, name);
				collections[name] = size;
			}),
		);
		return collections;
	};

	transaction = (opts: {
		mode?: QueryMode;
		storeNames: string[];
		abort?: AbortSignal;
	}): AbstractTransaction => {
		return this.createTransaction(opts.storeNames, {
			mode: opts.mode,
			abort: opts.abort,
		});
	};

	findOneOid = async (opts: {
		collection: string;
		index?: CollectionFilter;
	}): Promise<ObjectIdentifier | null> => {
		const result = await this.run<IDBCursorWithValue | null>(
			opts.collection,
			(store) => {
				const source = opts.index?.where
					? store.index(opts.index.where)
					: store;
				const direction = opts.index?.order === 'desc' ? 'prev' : 'next';
				const range = getRange(this.ctx.schema, opts.collection, opts.index);
				return source.openCursor(range, direction);
			},
			{ mode: 'readonly' },
		);
		if (result) {
			return createOid(opts.collection, result.primaryKey.toString());
		}
		return null;
	};
	findAllOids = async ({
		collection,
		index,
		offset,
		limit,
	}: {
		collection: string;
		index?: CollectionFilter;
		limit?: number;
		offset?: number;
	}): Promise<{ result: ObjectIdentifier[]; hasNextPage: boolean }> => {
		const tx = this.createTransaction([collection], { mode: 'readonly' });
		const store = tx.objectStore(collection);
		const source = index?.where ? store.index(index.where) : store;
		const direction = index?.order === 'desc' ? 'prev' : 'next';
		const range = getRange(this.ctx.schema, collection, index);
		const request = source.openCursor(range, direction);

		let hasNextPage = false;
		const result = await new Promise<string[]>((resolve, reject) => {
			let hasDoneOffset = !offset;
			let visited = 0;
			const results = new Set<ObjectIdentifier>();

			request.onsuccess = () => {
				visited++;
				const cursor = request.result as IDBCursorWithValue | null;
				if (!cursor) {
					resolve(Array.from(results));
					return;
				}

				// first offset, if we have one. cursor opens at beginning.
				if (offset && !hasDoneOffset) {
					cursor.advance(offset);
					hasDoneOffset = true;
					// next iteration we begin adding results.
				} else {
					// add result to set, unless we have reached limit.
					if (!limit || results.size < limit) {
						results.add(createOid(collection, cursor.primaryKey.toString()));
					}
					// even if we reached limit, we keep going one more to check if there's
					// a next page.
					if (limit && visited > limit) {
						hasNextPage = true;
						// stop iteration here; we reached limit and we have next page
						// info we need.
						resolve(Array.from(results));
					} else {
						cursor.continue();
					}
				}
			};

			request.onerror = () => {
				if (request.error?.name === 'InvalidStateError') {
					this.ctx.log(
						'error',
						`find query failed with InvalidStateError`,
						request.error,
					);
					resolve([]);
				} else if (request.error && isAbortError(request.error)) {
					resolve([]);
				} else {
					reject(request.error);
				}
			};
		});

		return {
			result,
			hasNextPage,
		};
	};

	saveEntities = async (
		entities: { oid: ObjectIdentifier; getSnapshot: () => any }[],
		opts?: CommonQueryOptions & { abort?: AbortSignal },
	): Promise<void> => {
		if (entities.length === 0) return;

		let collections = Array.from(
			new Set(entities.map((e) => decomposeOid(e.oid).collection)),
		);

		const toRemove = collections.filter((c) => !this.ctx.schema.collections[c]);
		if (toRemove.length > 0) {
			this.ctx.log(
				'warn',
				`Ignoring entities from collections that no longer exist: ${toRemove.join(
					', ',
				)}`,
			);
		}
		const withRemoved = new Set(collections);
		toRemove.forEach((c) => withRemoved.delete(c));
		collections = Array.from(withRemoved);

		const options = {
			transaction: this.createTransaction(collections, {
				mode: 'readwrite',
				abort: opts?.abort,
			}),
		};

		// FIXME: not test is making it to this line

		await Promise.all(
			entities.map(async (e) => {
				const snapshot = e.getSnapshot();
				try {
					await this.saveDocument(e.oid, snapshot, options);
				} catch (err) {
					this.ctx.log(
						'error',
						`Error saving document ${e.oid} (${JSON.stringify(snapshot)})`,
						err,
					);
					if (err instanceof Error) {
						throw err;
					} else {
						throw new Error('Unknown error saving document');
					}
				}
			}),
		);
		options.transaction.commit();
		this.ctx.entityEvents.emit('collectionsChanged', collections);
		for (const entity of entities) {
			this.ctx.entityEvents.emit('documentChanged', entity.oid);
		}
	};

	reset = async (opts?: {
		transaction?: AbstractTransaction;
	}): Promise<void> => {
		const names = Object.keys(this.ctx.schema.collections);
		const tx =
			(opts?.transaction as IDBTransaction) ||
			this.createTransaction(names, { mode: 'readwrite' });
		await Promise.all(
			names.map((name) =>
				this.run(name, (store) => store.clear(), { transaction: tx }),
			),
		);
		this.ctx.entityEvents.emit('collectionsChanged', names);
		this.ctx.log('info', '💨 Reset queryable storage');
	};

	dispose = () => {
		return closeDatabase(this.db);
	};

	private saveDocument = async (
		oid: ObjectIdentifier,
		doc: any,
		{ transaction }: { transaction?: IDBTransaction },
	) => {
		this.ctx.log('debug', `Saving document indexes for querying ${oid}`, doc);
		const { collection, id } = decomposeOid(oid);
		if (!doc) {
			await this.run(collection, (store) => store.delete(id), {
				mode: 'readwrite',
				transaction,
			});
			this.ctx.log('debug', `Deleted document indexes for querying ${oid}`);
		} else {
			const schema = this.ctx.schema.collections[collection];
			// no need to validate before storing; the entity's snapshot is already validated.
			const indexes = getIndexValues(schema, doc);
			await this.run(collection, (store) => store.put(indexes), {
				mode: 'readwrite',
				transaction,
			});
			this.ctx.log('debug', `Saved document indexes for querying ${oid}`, doc);
		}
	};
}
