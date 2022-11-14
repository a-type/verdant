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
	assignIndexValues,
	DocumentBaseline,
	groupPatchesByRootOid,
} from '@lo-fi/common';
import { EntityBase, getStoredEntitySnapshot, ObjectEntity } from './Entity.js';
import { storeRequestPromise } from '../idb.js';
import { Metadata } from '../metadata/Metadata.js';
import { UndoHistory } from '../UndoHistory.js';
import { DocumentFamilyCache } from './DocumentFamiliyCache.js';

export class EntityStore extends EventSubscriber<{
	collectionsChanged: (collections: string[]) => void;
	message: (message: ClientMessage) => void;
}> {
	private documentFamilyCaches = new Map<string, DocumentFamilyCache>();

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

	private getDocumentSchema = (oid: ObjectIdentifier) => {
		const { collection } = decomposeOid(oid);
		return {
			type: 'object',
			properties: this.schema.collections[collection].fields as any,
		} as const;
	};

	private openFamilyCache = async (oid: ObjectIdentifier) => {
		const documentOid = getOidRoot(oid);
		let familyCache = this.documentFamilyCaches.get(documentOid);
		if (!familyCache) {
			// metadata must be loaded from database to initialize family cache
			const transaction = this.meta.createTransaction([
				'baselines',
				'operations',
			]);

			const baselines: DocumentBaseline[] = [];
			const operations: Operation[] = [];

			await Promise.all([
				this.meta.baselines.iterateOverAllForDocument(
					documentOid,
					(baseline) => {
						baselines.push(baseline);
					},
					{
						transaction,
					},
				),
				this.meta.operations.iterateOverAllOperationsForDocument(
					documentOid,
					(op) => operations.push(op),
					{ transaction },
				),
			]);

			familyCache = new DocumentFamilyCache({
				oid: documentOid,
				baselines,
				operations,
				store: this,
			});
			familyCache.subscribe('change:*', this.onEntityChange);
			this.documentFamilyCaches.set(documentOid, familyCache);
		}

		return familyCache;
	};

	private onEntityChange = async (oid: ObjectIdentifier) => {
		this.writeDocumentToStorage(oid);
	};

	private writeDocumentToStorage = async (oid: ObjectIdentifier) => {
		const rootOid = getOidRoot(oid);
		const { id, collection } = decomposeOid(rootOid);
		const entity = await this.get(rootOid);
		const snapshot = getStoredEntitySnapshot(entity);
		if (snapshot) {
			const stored = cloneDeep(snapshot);
			assignIndexValues(this.schema.collections[collection], stored);
			const tx = this.db.transaction(collection, 'readwrite');
			const store = tx.objectStore(collection);
			await storeRequestPromise(store.put(stored));
		} else {
			const tx = this.db.transaction(collection, 'readwrite');
			const store = tx.objectStore(collection);
			await storeRequestPromise(store.delete(id));
		}
	};

	get = async (oid: ObjectIdentifier) => {
		const familyCache = await this.openFamilyCache(oid);

		return familyCache.getEntity(oid, this.getDocumentSchema(oid));
	};

	/**
	 * Creates a new document and returns an Entity for it. The created
	 * document is submitted to storage and sync.
	 */
	create = async (initial: any, oid: ObjectIdentifier) => {
		assignOid(initial, oid);
		const operations = this.meta.patchCreator.createInitialize(initial, oid);
		const familyCache = await this.openFamilyCache(oid);
		familyCache.insertUnconfirmedOperations(operations);
		// don't enqueue these, submit as distinct operation
		await this.submitOperations(operations);
		return familyCache.getEntity(oid, this.getDocumentSchema(oid));
	};

	private addOperationsToOpenCaches = (
		operations: Operation[],
		confirmed = true,
	) => {
		const operationsByOid = groupPatchesByRootOid(operations);
		const oids = Object.keys(operationsByOid);
		oids.forEach((oid) => {
			const familyCache = this.documentFamilyCaches.get(oid);
			if (familyCache) {
				if (confirmed) {
					familyCache.insertOperations(operationsByOid[oid]);
				} else {
					familyCache.insertUnconfirmedOperations(operationsByOid[oid]);
				}
			}
		});
	};

	addLocalOperations = async (operations: Operation[]) => {
		this.addOperationsToOpenCaches(operations, false);
		this.enqueueOperations(operations);
	};

	addRemoteOperations = async (operations: Operation[]) => {
		this.addOperationsToOpenCaches(operations);
		const affectedDocOids = await this.meta.insertRemoteOperations(operations);
		for (const oid of affectedDocOids) {
			await this.writeDocumentToStorage(oid);
		}
		const affectedCollections = new Set(
			affectedDocOids.map((oid) => decomposeOid(oid).collection),
		);
		this.emit('collectionsChanged', Array.from(affectedCollections));
	};

	addRemoteBaselines = async (baselines: DocumentBaseline[]) => {
		await this.meta.insertRemoteBaselines(baselines);
	};

	private pendingOperations: Operation[] = [];
	private enqueueOperations = (operations: Operation[]) => {
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
		// TODO: find a more efficient and straightforward way to update affected
		// queries. Move to Metadata?
		const affectedCollections = new Set(
			operations.map(({ oid }) => decomposeOid(oid).collection),
		);
		this.emit('collectionsChanged', Array.from(affectedCollections));

		// confirm the operations
		this.addOperationsToOpenCaches(operations);
	};

	private getInverseOperations = async (ops: Operation[]) => {
		const grouped = groupPatchesByIdentifier(ops);
		const inverseOps: Operation[] = [];
		for (const [oid, patches] of Object.entries(grouped)) {
			const familyCache = await this.openFamilyCache(oid);
			let view = familyCache.computeConfirmedView(oid);
			if (view) {
				view = cloneDeep(view);
				assignOid(view, oid);
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
				const applied = applyPatches(copy, patches);
				const { keyPath } = decomposeOid(oid);
				let inverse: Operation[] = [];
				if (!applied) {
					inverse = initialToPatches(view, oid, () => this.meta.now);
				} else {
					inverse = diffToPatches(applied, view, () => this.meta.now, keyPath);
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
		for (const cache of this.documentFamilyCaches.values()) {
			cache.dispose();
		}
		this.documentFamilyCaches.clear();
	};
}
