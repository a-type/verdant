import {
	assignOid,
	decomposeOid,
	EventSubscriber,
	getOid,
	getOidRoot,
	getRoots,
	ObjectIdentifier,
	Operation,
	OperationPatch,
	StorageCollectionSchema,
	StorageSchema,
	assert,
	ClientMessage,
	groupPatchesByIdentifier,
	applyPatches,
	diffToPatches,
	cloneDeep,
	initialToPatches,
} from '@lo-fi/common';
import {
	deleteEntity,
	EntityBase,
	getStoredEntitySnapshot,
	ObjectEntity,
	updateEntity,
} from './Entity.js';
import { storeRequestPromise } from './idb.js';
import { Metadata } from './metadata/Metadata.js';
import { computeCompoundIndices, computeSynthetics } from './indexes.js';
import { UndoHistory } from './UndoHistory.js';

export class EntityStore extends EventSubscriber<{
	collectionsChanged: (collections: string[]) => void;
	message: (message: ClientMessage) => void;
}> {
	private cache = new Map<string, EntityBase<any>>();
	private cleanupTimeouts = new WeakMap<EntityBase<any>, NodeJS.Timeout>();

	private readonly db;
	private readonly schema;
	public readonly meta;
	public readonly undoHistory;
	private batchTimeout = 200;
	private log;

	constructor({
		db,
		schema,
		meta,
		undoHistory,
		batchTimeout = 200,
		log = () => {},
	}: {
		db: IDBDatabase;
		schema: StorageSchema;
		meta: Metadata;
		undoHistory: UndoHistory;
		batchTimeout?: number;
		log?: (...args: any[]) => void;
	}) {
		super();
		this.db = db;
		this.schema = schema;
		this.meta = meta;
		this.undoHistory = undoHistory;
		this.batchTimeout = batchTimeout;
		this.log = log;
	}

	onSubscribed = (self: EntityBase<any>) => {
		this.cache.set(self.oid, self);
		const timeout = this.cleanupTimeouts.get(self);
		if (timeout) {
			clearTimeout(timeout);
		}
	};
	onAllUnsubscribed = (self: EntityBase<any>) => {
		this.queueCacheCleanup(self);
	};

	private queueCacheCleanup = (entity: EntityBase<any>) => {
		const timeout = this.cleanupTimeouts.get(entity);
		if (timeout) {
			clearTimeout(timeout);
		}

		this.cleanupTimeouts.set(
			entity,
			setTimeout(() => {
				if (entity.subscriberCount > 0) return;
				if (this.cache.get(entity.oid) !== entity) {
					return;
				}
				this.cache.delete(entity.oid);
				console.debug(`Entity ${entity.oid} removed from cache`);
			}, 100),
		);
	};

	get = (initial: any) => {
		const oid = getOid(initial);
		const existing = this.cache.get(oid);
		if (existing) {
			return existing;
		}

		const { collection } = decomposeOid(oid);
		this.stripIndexes(collection, initial);

		const entity: ObjectEntity<any> = new ObjectEntity(
			oid,
			initial,
			this,
			{
				onSubscribed: () => this.onSubscribed(entity),
				onAllUnsubscribed: () => this.onAllUnsubscribed(entity),
			},
			{
				type: 'object',
				properties: this.schema.collections[collection].fields as any,
			},
		);

		this.cache.set(oid, entity);
		// if nothing subscribes, it will be cleaned up.
		this.queueCacheCleanup(entity);

		return entity;
	};

	/**
	 * TODO: disambiguate retrieving documents and live objects.
	 * Find a place for this.
	 */
	getFromOid = async (oid: ObjectIdentifier) => {
		const existing = this.cache.get(oid);
		if (existing) {
			return existing;
		}

		const { collection } = decomposeOid(oid);
		const store = this.db
			.transaction(collection, 'readonly')
			.objectStore(collection);
		const result = await storeRequestPromise(store.get(oid));
		if (result) {
			return this.get(result);
		} else {
			return null;
		}
	};

	create = async (initial: any, oid: ObjectIdentifier) => {
		assignOid(initial, oid);
		const operations = this.meta.patchCreator.createInitialize(initial, oid);
		// don't enqueue these, submit as distinct operation
		await this.submitOperations(operations);
		return this.get(initial);
	};

	private pendingOperations: Operation[] = [];
	enqueueOperations = (operations: Operation[]) => {
		const isFirstSet = this.pendingOperations.length === 0;
		this.pendingOperations.push(...operations);
		if (isFirstSet) {
			setTimeout(this.flushPatches, this.batchTimeout);
		}
	};

	private flushPatches = async () => {
		if (!this.pendingOperations.length) {
			return;
		}

		await this.submitOperations(this.pendingOperations);
		this.pendingOperations = [];
	};

	private submitOperations = async (
		operations: Operation[],
		notUndoable = false,
	) => {
		if (!notUndoable) {
			// FIXME: this is too slow and needs to be optimized.
			this.undoHistory.addUndo(await this.createUndo(operations));
		}
		await this.meta.insertLocalOperation(operations);
		const operation = await this.meta.messageCreator.createOperation({
			operations,
		});
		this.emit('message', operation);
		const affectedDocuments = getRoots(operations.map((p) => p.oid));
		await Promise.all(affectedDocuments.map(this.refresh));
		// TODO: find a more efficient and straightforward way to update affected
		// queries
		const affectedCollections = new Set(
			affectedDocuments.map((oid) => decomposeOid(oid).collection),
		);
		this.emit('collectionsChanged', Array.from(affectedCollections));
	};

	private getInverseOperations = async (ops: Operation[]) => {
		const grouped = groupPatchesByIdentifier(ops);
		const inverseOps: Operation[] = [];
		for (const [oid, patches] of Object.entries(grouped)) {
			const ent = this.cache.get(oid);
			let view;
			if (ent) {
				view = getStoredEntitySnapshot(ent);
			} else {
				view = await this.meta.getRecursiveComputedEntity(oid);
			}
			// if the entity doesn't exist, the inverse
			// is a delete.
			if (!view) {
				// double-check sanity - a creation should start with initialize.
				// if not, maybe the cache is broken?
				if (patches[0].op === 'initialize') {
					inverseOps.push({
						oid,
						timestamp: this.meta.now,
						data: {
							op: 'delete',
						},
					});
				}
			} else {
				const copy = cloneDeep(view);
				const applied = await applyPatches(copy, patches);
				let inverse: Operation[] = [];
				if (!applied) {
					inverse = initialToPatches(view, oid, () => this.meta.now);
				} else {
					inverse = diffToPatches(applied, view, () => this.meta.now);
				}
				inverseOps.push(...inverse);
			}
		}
		return inverseOps;
	};

	private createUndo = async (ops: Operation[]) => {
		const inverseOps = await this.getInverseOperations(ops);
		return async () => {
			const redo = await this.createUndo(inverseOps);
			await this.submitOperations(
				inverseOps.map((op) => {
					op.timestamp = this.meta.now;
					return op;
				}),
				true,
			);
			return redo;
		};
	};

	/**
	 * Internal implementation which doesn't emit events.
	 */
	private doRefresh = async (oid: ObjectIdentifier) => {
		const view = await this.meta.getComputedDocument(oid);
		await this.storeView(oid, view);
		const entity = this.cache.get(oid);
		if (entity) {
			if (view === undefined) {
				deleteEntity(entity);
			} else {
				updateEntity(entity, view);
			}
		}
	};

	refresh = async (oid: ObjectIdentifier) => {
		await this.doRefresh(oid);
		this.emit('collectionsChanged', [decomposeOid(oid).collection]);
	};

	refreshAll = async (oids: ObjectIdentifier[]) => {
		const affectedCollections = new Set<string>();
		for (const oid of oids) {
			await this.doRefresh(oid);
			affectedCollections.add(decomposeOid(oid).collection);
		}
		this.emit('collectionsChanged', Array.from(affectedCollections));
	};

	delete = async (oid: ObjectIdentifier) => {
		assert(
			oid === getOidRoot(oid),
			'Only root documents may be deleted via client methods',
		);
		// we need to get all sub-object oids to delete alongside the root
		const allOids = await this.meta.getAllDocumentRelatedOids(oid);
		const patches = this.meta.patchCreator.createDeleteAll(allOids);
		// don't enqueue these, submit as distinct operation
		await this.submitOperations(patches);
	};

	deleteAll = async (oids: ObjectIdentifier[]) => {
		const allOids = await Promise.all(
			oids.map((oid) => this.meta.getAllDocumentRelatedOids(oid)),
		);
		const patches = this.meta.patchCreator.createDeleteAll(allOids.flat());
		// don't enqueue these, submit as distinct operation
		await this.submitOperations(patches);
	};

	private storeView = async (oid: ObjectIdentifier, view: any) => {
		this.log('Storing view', oid, view);
		const isDeleted = !view;
		if (isDeleted) {
			// delete from database
			const { collection } = decomposeOid(oid);
			const store = this.db
				.transaction(collection, 'readwrite')
				.objectStore(collection);
			const { id } = decomposeOid(oid);
			await storeRequestPromise(store.delete(id));
		} else {
			const { collection, id } = decomposeOid(oid);
			const stored = { ...view };
			// apply synthetic and compound index values before storing
			Object.assign(
				stored,
				computeSynthetics(this.schema.collections[collection], stored),
			);
			Object.assign(
				stored,
				computeCompoundIndices(this.schema.collections[collection], stored),
			);

			const tx = this.db.transaction(collection, 'readwrite');
			const store = tx.objectStore(collection);
			await storeRequestPromise(store.put(stored));
		}
	};

	private stripIndexes = (collection: string, view: any) => {
		const { synthetics = {}, compounds = {} } = this.schema.collections[
			collection
		] as StorageCollectionSchema<any, any, any>;
		for (const synthetic of Object.keys(synthetics)) {
			delete view[synthetic];
		}
		for (const compoundIndex of Object.keys(compounds)) {
			delete view[compoundIndex];
		}
	};

	reset = async () => {
		const tx = this.db.transaction(
			Object.keys(this.schema.collections),
			'readwrite',
		);
		for (const collection of Object.keys(this.schema.collections)) {
			const store = tx.objectStore(collection);
			await storeRequestPromise(store.clear());
		}
	};

	destroy = async () => {
		for (const ent of this.cache.values()) {
			ent.dispose();
		}
		this.cache.clear();
	};
}
