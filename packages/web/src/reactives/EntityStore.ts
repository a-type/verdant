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
	generateId,
	getOidRoot,
	getUndoOperations,
	groupBaselinesByRootOid,
	groupPatchesByIdentifier,
	groupPatchesByRootOid,
	ObjectIdentifier,
	Operation,
} from '@lo-fi/common';
import { Context } from '../context.js';
import { storeRequestPromise } from '../idb.js';
import { Metadata } from '../metadata/Metadata.js';
import { DocumentFamilyCache } from './DocumentFamiliyCache.js';

const DEFAULT_BATCH_KEY = '@@default';

export interface OperationBatch {
	run: (fn: () => void) => this;
	flush: () => Promise<void>;
	discard: () => void;
}

export class EntityStore extends EventSubscriber<{
	collectionsChanged: (collections: string[]) => void;
}> {
	private documentFamilyCaches = new Map<string, DocumentFamilyCache>();

	public meta;
	private operationBatcher;

	private context: Context;

	private unsubscribes: (() => void)[] = [];

	private _disposed = false;

	private get log() {
		return this.context.log;
	}
	private get db() {
		return this.context.documentDb;
	}
	private get undoHistory() {
		return this.context.undoHistory;
	}
	private get schema() {
		return this.context.schema;
	}

	private currentBatchKey = DEFAULT_BATCH_KEY;
	private defaultBatchTimeout: number;

	constructor({
		context,
		meta,
		batchTimeout = 200,
	}: {
		context: Context;
		meta: Metadata;
		batchTimeout?: number;
	}) {
		super();

		this.context = context;

		this.defaultBatchTimeout = batchTimeout;
		this.meta = meta;
		this.operationBatcher = new Batcher<Operation, { undoable?: boolean }>(
			this.flushOperations,
		);
		// initialize default batch
		this.operationBatcher.add({
			key: DEFAULT_BATCH_KEY,
			items: [],
			max: 100,
			timeout: batchTimeout,
			userData: { undoable: true },
		});
		this.unsubscribes.push(this.meta.subscribe('rebase', this.handleRebase));
	}

	setContext = (context: Context) => {
		this.context = context;
	};

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

			// TODO: cleanup cache when all documents are disposed
		}

		return familyCache;
	};

	private onEntityChange = async (oid: ObjectIdentifier) => {
		// queueMicrotask(() => this.writeDocumentToStorage(oid));
	};

	private writeDocumentToStorage = async (oid: ObjectIdentifier) => {
		if (this._disposed) {
			this.log('warn', 'EntityStore is disposed, not writing to storage');
			return;
		}
		const rootOid = getOidRoot(oid);
		const { id, collection } = decomposeOid(rootOid);
		const entity = await this.get(rootOid);

		if (this._disposed) {
			this.log('warn', 'EntityStore is disposed, not writing to storage');
			return;
		}

		const snapshot = entity?.getSnapshot();
		if (snapshot) {
			const stored = cloneDeep(snapshot);
			assignIndexValues(this.schema.collections[collection], stored);
			// IMPORTANT! this property must be assigned
			assignOidPropertiesToAllSubObjects(stored);
			try {
				const tx = this.db.transaction(collection, 'readwrite');
				const store = tx.objectStore(collection);
				await storeRequestPromise(store.put(stored));
				this.log('info', '📝', 'wrote', collection, id, 'to storage');
			} catch (err) {
				// if the document can't be written, something's very wrong :(
				// log the error and move on...
				this.log(
					"⚠️ CRITICAL: possibly corrupt data couldn't be written to queryable storage. This is probably a bug in lo-fi! Please report at https://github.com/a-type/lo-fi/issues",
					'\n',
					'Invalid data:',
					JSON.stringify(stored),
				);
			}
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
	 * Advanced usage!
	 * Immediately returns an entity if it exists in the memory cache. An
	 * entity would be cached if it has been retrieved by a live query.
	 */
	getCached = (oid: ObjectIdentifier) => {
		const cache = this.documentFamilyCaches.get(oid);
		if (cache) {
			return cache.getEntity(oid, this.getDocumentSchema(oid));
		}
		return null;
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
		info: { isLocal: boolean },
	) => {
		const operationsByOid = groupPatchesByRootOid(operations);
		const oids = Object.keys(operationsByOid);
		oids.forEach((oid) => {
			const familyCache = this.documentFamilyCaches.get(oid);
			if (familyCache) {
				this.log(
					'adding',
					confirmed ? 'confirmed' : 'unconfirmed',
					'operations to cache',
					oid,
					operationsByOid[oid].length,
				);
				if (confirmed) {
					familyCache.insertOperations(operationsByOid[oid], info);
				} else {
					familyCache.insertUnconfirmedOperations(operationsByOid[oid]);
				}
			}
		});
	};

	private addBaselinesToCaches = async (
		baselines: DocumentBaseline[],
		info: { isLocal: boolean },
	) => {
		const baselinesByOid = groupBaselinesByRootOid(baselines);
		const oids = Object.keys(baselinesByOid);
		const caches = await Promise.all(
			oids.map((oid) => this.openFamilyCache(oid)),
		);
		oids.forEach((oid, i) => {
			const familyCache = caches[i];
			if (familyCache) {
				familyCache.insertBaselines(baselinesByOid[oid], info);
			}
		});
	};

	private addDataToOpenCaches = ({
		baselines,
		operations,
		reset,
		isLocal,
	}: {
		baselines: DocumentBaseline[];
		operations: Operation[];
		reset?: boolean;
		isLocal?: boolean;
	}) => {
		const baselinesByDocumentOid = groupBaselinesByRootOid(baselines);
		const operationsByDocumentOid = groupPatchesByRootOid(operations);
		const allDocumentOids = Array.from(
			new Set(
				Object.keys(baselinesByDocumentOid).concat(
					Object.keys(operationsByDocumentOid),
				),
			),
		);
		for (const oid of allDocumentOids) {
			const familyCache = this.documentFamilyCaches.get(oid);
			if (familyCache) {
				familyCache.addConfirmedData({
					operations: operationsByDocumentOid[oid] || [],
					baselines: baselinesByDocumentOid[oid] || [],
					reset,
					isLocal,
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
		if (reset) {
			this.log(
				'Resetting local store to replicate remote synced data',
				baselines.length,
				'baselines, and',
				operations.length,
				'operations',
			);
			await this.meta.reset();
			await this.resetStoredDocuments();
		}
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

	addLocalOperations = async (operations: Operation[]) => {
		this.log('Adding local operations', operations.length);
		this.addOperationsToOpenCaches(operations, false, { isLocal: true });
		this.operationBatcher.add({
			key: this.currentBatchKey,
			items: operations,
		});
	};

	batch = ({
		undoable = true,
		batchName = generateId(),
		max = null,
		timeout = this.defaultBatchTimeout,
	}: {
		undoable?: boolean;
		batchName?: string;
		max?: number | null;
		timeout?: number | null;
	} = {}): OperationBatch => {
		const internalBatch = this.operationBatcher.add({
			key: batchName,
			max,
			timeout,
			items: [],
			userData: { undoable },
		});
		const externalApi: OperationBatch = {
			run: (fn: () => void) => {
				// while the provided function runs, operations are forwarded
				// to the new batch instead of default. this relies on the function
				// being synchronous.
				this.currentBatchKey = batchName;
				fn();
				this.currentBatchKey = DEFAULT_BATCH_KEY;
				return externalApi;
			},
			flush: () => internalBatch.flush(),
			discard: () => {
				this.operationBatcher.discard(batchName);
			},
		};
		return externalApi;
	};

	flushPatches = async () => {
		await this.operationBatcher.flush(this.currentBatchKey);
	};

	private flushOperations = async (
		operations: Operation[],
		batchKey: string,
		meta: { undoable?: boolean },
	) => {
		this.log('Flushing operations', operations.length, 'to storage / sync');
		await this.submitOperations(operations, meta);
	};

	private submitOperations = async (
		operations: Operation[],
		{ undoable = true }: { undoable?: boolean } = {},
	) => {
		if (undoable) {
			// FIXME: this is too slow and needs to be optimized.
			this.undoHistory.addUndo(await this.createUndo(operations));
		}
		await this.meta.insertLocalOperation(operations);

		// recompute all affected documents for querying
		const allDocumentOids = Array.from(
			new Set(operations.map((op) => getOidRoot(op.oid))),
		);

		// confirm the operations
		this.addDataToOpenCaches({ operations, baselines: [], isLocal: true });

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
			inverseOps.unshift(...inverse);
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
				// undos should not generate their own undo operations
				// since they already calculate redo as the inverse.
				{ undoable: false },
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
		this.addBaselinesToCaches(baselines, { isLocal: true });
	};

	private resetStoredDocuments = async () => {
		const tx = this.db.transaction(
			Object.keys(this.schema.collections),
			'readwrite',
		);
		for (const collection of Object.keys(this.schema.collections)) {
			const store = tx.objectStore(collection);
			await storeRequestPromise(store.clear());
		}
	};
}
