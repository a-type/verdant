import {
	ObjectIdentifier,
	decomposeOid,
	getIndexValues,
} from '@verdant-web/common';
import { IDBService } from '../IDBService.js';
import { Context } from '../context.js';
import { storeRequestPromise } from '../idb.js';

export class QueryableStorage extends IDBService {
	private ctx;

	constructor({ ctx }: { ctx: Context }) {
		super(ctx.documentDb, { log: ctx.log });
		this.ctx = ctx;
		this.addDispose(
			this.ctx.internalEvents.subscribe('documentDbChanged', (db) => {
				this.db = db;
			}),
		);
	}

	/**
	 * DELETES EVERYTHING IN THE QUERYABLE DATABASE
	 */
	reset = async () => {
		const allCollections = Object.keys(this.ctx.schema.collections);
		const tx = this.createTransaction(allCollections, { mode: 'readwrite' });
		await Promise.all(
			allCollections.map((collection) => {
				const store = tx.objectStore(collection);
				return storeRequestPromise(store.clear());
			}),
		);
		// notify queries to re-run now.
		this.ctx.entityEvents.emit('collectionsChanged', allCollections);
		this.ctx.log('info', '💨 Reset queryable storage');
	};

	saveEntities = async (
		entities: { oid: ObjectIdentifier; getSnapshot: () => any }[],
		opts?: { abort?: AbortSignal },
	) => {
		if (entities.length === 0) {
			return;
		}

		let collections = Array.from(
			new Set(entities.map((e) => decomposeOid(e.oid).collection)),
		);
		// we could theoretically receive entities from old schema versions which no
		// longer have collections. We should ignore these. If we don't, the transaction
		// will fail, because the object store doesn't exist.
		const toRemove = collections.filter((c) => !this.ctx.schema.collections[c]);
		if (toRemove.length > 0) {
			this.ctx.log(
				'warn',
				`Ignoring entities from collections that no longer exist: ${toRemove.join(
					', ',
				)}`,
			);
			const withRemoved = new Set(collections);
			toRemove.forEach((c) => withRemoved.delete(c));
			collections = Array.from(withRemoved);
		}
		const options = {
			transaction: this.createTransaction(collections, {
				mode: 'readwrite',
				abort: opts?.abort,
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
		this.ctx.entityEvents.emit('collectionsChanged', collections);
		for (const entity of entities) {
			this.ctx.entityEvents.emit('documentChanged', entity.oid);
		}
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
