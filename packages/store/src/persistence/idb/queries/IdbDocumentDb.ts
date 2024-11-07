import {
	CollectionFilter,
	createOid,
	decomposeOid,
	getIndexValues,
	ObjectIdentifier,
} from '@verdant-web/common';
import { Context } from '../../../context/context.js';
import { PersistenceDocumentDb } from '../../interfaces.js';
import { IdbService } from '../IdbService.js';
import { getRange } from './ranges.js';
import { closeDatabase, getSizeOfObjectStore, isAbortError } from '../util.js';

export class IdbDocumentDb extends IdbService implements PersistenceDocumentDb {
	private ctx;
	constructor(db: IDBDatabase, context: Omit<Context, 'documents' | 'files'>) {
		super(db, { log: context.log });
		this.ctx = context;
		this.addDispose(() => {
			this.ctx.log('info', 'Closing document database for', this.ctx.namespace);
			return closeDatabase(this.db);
		});
	}

	close = async () => {
		await this.dispose();
	};

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
		optsAndInfo: { abort?: AbortSignal; collections: string[] },
	): Promise<void> => {
		const options = {
			transaction: this.createTransaction(optsAndInfo.collections, {
				mode: 'readwrite',
				abort: optsAndInfo.abort,
			}),
		};

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
	};

	reset = async (): Promise<void> => {
		const names = Object.keys(this.ctx.schema.collections);
		const tx = this.createTransaction(names, { mode: 'readwrite' });
		await Promise.all(
			names.map((name) =>
				this.run(name, (store) => store.clear(), { transaction: tx }),
			),
		);
		this.ctx.entityEvents.emit('collectionsChanged', names);
		this.ctx.log('info', '💨 Reset queryable storage');
	};

	private saveDocument = async (
		oid: ObjectIdentifier,
		doc: any,
		{ transaction }: { transaction?: IDBTransaction },
	) => {
		this.ctx.log('debug', `Saving document indexes for querying ${oid}`);
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
			indexes['@@@snapshot'] = JSON.stringify(doc);
			await this.run(collection, (store) => store.put(indexes), {
				mode: 'readwrite',
				transaction,
			});
			this.ctx.log('debug', `Save complete for ${oid}`, indexes);
		}
	};
}
