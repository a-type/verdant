import {
	assert,
	assignIndexValues,
	assignOid,
	assignOidPropertiesToAllSubObjects,
	Batcher,
	cloneDeep,
	decomposeOid,
	DocumentBaseline,
	EventSubscriber,
	getOidRoot,
	getUndoOperations,
	groupBaselinesByRootOid,
	groupPatchesByIdentifier,
	groupPatchesByRootOid,
	ObjectIdentifier,
	Operation,
	StorageSchema,
} from '@lo-fi/common';
import { storeRequestPromise } from '../idb.js';
import { Metadata } from '../metadata/Metadata.js';
import { UndoHistory } from '../UndoHistory.js';
import { DocumentFamilyCache } from './DocumentFamiliyCache.js';

export class EntityStore extends EventSubscriber<{
	collectionsChanged: (collections: string[]) => void;
}> {
	private documentFamilyCaches = new Map<string, DocumentFamilyCache>();

	private readonly db;
	private readonly schema;
	public readonly meta;
	public readonly undoHistory;
	private log;
	private operationBatcher;

	private unsubscribes: (() => void)[] = [];

	private _disposed = false;

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
		this.log = log;
		this.operationBatcher = new Batcher(this.flushOperations, {
			max: 100,
			timeout: batchTimeout,
		});
		this.unsubscribes.push(this.meta.subscribe('rebase', this.handleRebase));
	}

	private getDocumentSchema = (oid: ObjectIdentifier) => {
		const { collection } = decomposeOid(oid);
		return {
			type: 'object',
			properties: this.schema.collections[collection].fields as any,
		} as const;
	};

	private resetFamilyCache = async (familyCache: DocumentFamilyCache) => {
		// metadata must be loaded from database to initialize family cache
		const transaction = this.meta.createTransaction([
			'baselines',
			'operations',
		]);

		const baselines: DocumentBaseline[] = [];
		const operations: Operation[] = [];

		await Promise.all([
			this.meta.baselines.iterateOverAllForDocument(
				familyCache.oid,
				(baseline) => {
					baselines.push(baseline);
				},
				{
					transaction,
				},
			),
			this.meta.operations.iterateOverAllOperationsForDocument(
				familyCache.oid,
				(op) => operations.push(op),
				{ transaction },
			),
		]);
		familyCache.reset(operations, baselines);
	};

	private openFamilyCache = async (oid: ObjectIdentifier) => {
		const documentOid = getOidRoot(oid);
		let familyCache = this.documentFamilyCaches.get(documentOid);
		if (!familyCache) {
			// metadata must be loaded from database to initialize family cache
			familyCache = new DocumentFamilyCache({
				oid: documentOid,
				store: this,
			});
			await this.resetFamilyCache(familyCache);

			this.unsubscribes.push(
				familyCache.subscribe('change:*', this.onEntityChange),
			);
			this.documentFamilyCaches.set(documentOid, familyCache);
		}

		return familyCache;
	};

	private onEntityChange = async (oid: ObjectIdentifier) => {
		// queueMicrotask(() => this.writeDocumentToStorage(oid));
	};

	private writeDocumentToStorage = async (oid: ObjectIdentifier) => {
		if (this._disposed) return;
		const rootOid = getOidRoot(oid);
		const { id, collection } = decomposeOid(rootOid);
		const entity = await this.get(rootOid);
		if (this._disposed) return;
		const snapshot = entity?.getSnapshot();
		if (snapshot) {
			const stored = cloneDeep(snapshot);
			assignIndexValues(this.schema.collections[collection], stored);
			// IMPORTANT! this property must be assigned
			assignOidPropertiesToAllSubObjects(stored);
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

	private addOperationsToOpenCaches = async (
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

	private addBaselinesToCaches = async (baselines: DocumentBaseline[]) => {
		const baselinesByOid = groupBaselinesByRootOid(baselines);
		const oids = Object.keys(baselinesByOid);
		const caches = await Promise.all(
			oids.map((oid) => this.openFamilyCache(oid)),
		);
		oids.forEach((oid, i) => {
			const familyCache = caches[i];
			if (familyCache) {
				familyCache.insertBaselines(baselinesByOid[oid]);
			}
		});
	};

	private addDataToOpenCaches = ({
		baselines,
		operations,
		reset,
	}: {
		baselines: DocumentBaseline[];
		operations: Operation[];
		reset?: boolean;
	}) => {
		const baselinesByDocumentOid = groupBaselinesByRootOid(baselines);
		const operationsByDocumentOid = groupPatchesByRootOid(operations);
		const allDocumentOids = Object.keys(baselinesByDocumentOid).concat(
			Object.keys(operationsByDocumentOid),
		);
		for (const oid of allDocumentOids) {
			const familyCache = this.documentFamilyCaches.get(oid);
			if (familyCache) {
				familyCache.addConfirmedData({
					operations: operationsByDocumentOid[oid] || [],
					baselines: baselinesByDocumentOid[oid] || [],
					reset,
				});
			}
		}

		return allDocumentOids;
	};

	addData = async ({
		operations,
		baselines,
		reset,
	}: {
		operations: Operation[];
		baselines: DocumentBaseline[];
		reset?: boolean;
	}) => {
		// first, synchronously add data to any open caches for immediate change propagation
		const allDocumentOids = this.addDataToOpenCaches({
			operations,
			baselines,
			reset,
		});

		// then, asynchronously add data to storage
		await this.meta.insertRemoteBaselines(baselines);
		await this.meta.insertRemoteOperations(operations);

		// recompute all affected documents for querying
		for (const oid of allDocumentOids) {
			await this.writeDocumentToStorage(oid);
		}

		// notify active queries
		const affectedCollections = new Set<string>(
			allDocumentOids.map((oid) => decomposeOid(oid).collection),
		);
		this.emit('collectionsChanged', Array.from(affectedCollections));
	};

	addLocalOperations = async (operations: Operation[], notUndoable = false) => {
		this.addOperationsToOpenCaches(operations, false);
		this.operationBatcher.add(
			notUndoable ? 'notUndoable' : 'default',
			...operations,
		);
	};

	flushPatches = async (batch = 'default') => {
		await this.operationBatcher.flush(batch);
	};

	private flushOperations = async (
		operations: Operation[],
		batchKey: string,
	) => {
		await this.submitOperations(operations, batchKey === 'notUndoable');
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

		// recompute all affected documents for querying
		const allDocumentOids = Array.from(
			new Set(operations.map((op) => getOidRoot(op.oid))),
		);

		// confirm the operations
		this.addDataToOpenCaches({ operations, baselines: [] });

		for (const oid of allDocumentOids) {
			await this.writeDocumentToStorage(oid);
		}

		// TODO: find a more efficient and straightforward way to update affected
		// queries. Move to Metadata?
		const affectedCollections = new Set(
			operations.map(({ oid }) => decomposeOid(oid).collection),
		);
		this.emit('collectionsChanged', Array.from(affectedCollections));
	};

	private getInverseOperations = async (ops: Operation[]) => {
		const grouped = groupPatchesByIdentifier(ops);
		const inverseOps: Operation[] = [];
		const getNow = () => this.meta.now;
		for (const [oid, patches] of Object.entries(grouped)) {
			const familyCache = await this.openFamilyCache(oid);
			let { view, deleted } = familyCache.computeConfirmedView(oid);
			const inverse = getUndoOperations(oid, view, patches, getNow);
			inverseOps.push(...inverse);
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

	reset = async () => {
		const tx = this.db.transaction(
			Object.keys(this.schema.collections),
			'readwrite',
		);
		for (const collection of Object.keys(this.schema.collections)) {
			const store = tx.objectStore(collection);
			await storeRequestPromise(store.clear());
		}
		for (const [_, cache] of this.documentFamilyCaches) {
			await this.resetFamilyCache(cache);
		}
	};

	destroy = () => {
		this._disposed = true;
		this.disable();
		for (const unsubscribe of this.unsubscribes) {
			unsubscribe();
		}
		for (const cache of this.documentFamilyCaches.values()) {
			cache.dispose();
		}
		this.documentFamilyCaches.clear();
	};

	private handleRebase = (baselines: DocumentBaseline[]) => {
		this.log('Reacting to rebases', baselines.length);
		this.addBaselinesToCaches(baselines);
	};
}
