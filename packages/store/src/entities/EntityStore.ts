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
	removeOidsFromAllSubObjects,
	StorageCollectionSchema,
} from '@verdant-web/common';
import { Context } from '../context.js';
import { FileManager } from '../files/FileManager.js';
import { processValueFiles } from '../files/utils.js';
import { storeRequestPromise } from '../idb.js';
import { Metadata } from '../metadata/Metadata.js';
import { DocumentFamilyCache } from './DocumentFamiliyCache.js';
import { TaggedOperation } from '../types.js';

const DEFAULT_BATCH_KEY = '@@default';

export interface OperationBatch {
	run: (fn: () => void) => this;
	flush: () => Promise<void>;
	discard: () => void;
}

export class EntityStore {
	private documentFamilyCaches = new Map<string, DocumentFamilyCache>();

	public meta;
	private operationBatcher;
	public files;

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
		files,
	}: {
		context: Context;
		meta: Metadata;
		files: FileManager;
		batchTimeout?: number;
	}) {
		this.context = context;

		this.defaultBatchTimeout = batchTimeout;
		this.meta = meta;
		this.files = files;
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
		if (!this.schema.collections[collection]) {
			this.log('warn', `Missing schema for collection: ${collection}`);
			return null;
		}
		return {
			type: 'object',
			properties: this.schema.collections[collection].fields as any,
		} as const;
	};

	private refreshFamilyCache = async (
		familyCache: DocumentFamilyCache,
		dropUnconfirmed = false,
	) => {
		// avoid writing to disposed db
		if (this._disposed) return;

		// metadata must be loaded from database to initialize family cache
		const transaction = this.meta.createTransaction([
			'baselines',
			'operations',
		]);

		const baselines: DocumentBaseline[] = [];
		const operations: TaggedOperation[] = [];

		await Promise.all([
			this.meta.baselines.iterateOverAllForDocument(
				familyCache.oid,
				(baseline) => {
					baselines.push(baseline);
				},
				{
					transaction,
					mode: 'readwrite',
				},
			),
			this.meta.operations.iterateOverAllOperationsForDocument(
				familyCache.oid,
				(op) => {
					(op as TaggedOperation).confirmed = true;
					operations.push(op as TaggedOperation);
				},
				{ transaction, mode: 'readwrite' },
			),
		]);
		familyCache.reset(operations, baselines, dropUnconfirmed);
	};

	private openFamilyCache = async (oid: ObjectIdentifier) => {
		const documentOid = getOidRoot(oid);
		let familyCache = this.documentFamilyCaches.get(documentOid);
		if (!familyCache) {
			// metadata must be loaded from database to initialize family cache
			familyCache = new DocumentFamilyCache({
				oid: documentOid,
				store: this,
				context: this.context,
			});
			this.documentFamilyCaches.set(documentOid, familyCache);
			await this.refreshFamilyCache(familyCache);

			// this.unsubscribes.push(
			// 	familyCache.subscribe('change:*', this.onEntityChange),
			// );

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
				this.log('info', '📝', 'wrote', collection, id, 'to storage', stored);
			} catch (err) {
				// if the document can't be written, something's very wrong :(
				// log the error and move on...
				this.log(
					"⚠️ CRITICAL: possibly corrupt data couldn't be written to queryable storage. This is probably a bug in verdant! Please report at https://github.com/a-type/verdant/issues",
					'\n',
					'Invalid data:',
					JSON.stringify(stored),
				);
			}
		} else {
			const tx = this.db.transaction(collection, 'readwrite');
			const store = tx.objectStore(collection);
			await storeRequestPromise(store.delete(id));
			this.log('info', '❌', 'deleted', collection, id, 'from storage');
		}
	};

	get = async (oid: ObjectIdentifier) => {
		const familyCache = await this.openFamilyCache(oid);
		const schema = this.getDocumentSchema(oid);
		if (!schema) {
			return null;
		}
		return familyCache.getEntity(oid, schema);
	};

	/**
	 * Advanced usage!
	 * Immediately returns an entity if it exists in the memory cache. An
	 * entity would be cached if it has been retrieved by a live query.
	 */
	getCached = (oid: ObjectIdentifier) => {
		const cache = this.documentFamilyCaches.get(oid);
		if (cache) {
			const schema = this.getDocumentSchema(oid);
			if (!schema) {
				return null;
			}
			return cache.getEntity(oid, schema);
		}
		return null;
	};

	/**
	 * Creates a new document and returns an Entity for it. The created
	 * document is submitted to storage and sync.
	 */
	create = async (
		initial: any,
		oid: ObjectIdentifier,
		options: { undoable?: boolean },
	) => {
		// remove all OID associations from initial data
		removeOidsFromAllSubObjects(initial);
		// first grab any file and replace them with refs
		const processed = processValueFiles(initial, this.files.add);

		assignOid(processed, oid);
		const operations = this.meta.patchCreator.createInitialize(processed, oid);
		const familyCache = await this.openFamilyCache(oid);
		familyCache.insertLocalOperations(operations);
		// don't enqueue these, submit as distinct operation.
		// we do this so it can be immediately queryable from storage...
		// only holding it in memory would introduce lag before it shows up
		// in other queries.
		await this.submitOperations(operations, options);
		const schema = this.getDocumentSchema(oid);
		if (!schema) {
			throw new Error(
				`Cannot create a document in the ${
					decomposeOid(oid).collection
				} collection; it is not defined in the current schema version.`,
			);
		}
		return familyCache.getEntity(oid, schema);
	};

	private addOperationsToOpenCaches = async (
		operations: Operation[],
		info: { isLocal: boolean; confirmed?: boolean },
	) => {
		const operationsByOid = groupPatchesByRootOid(operations);
		const oids = Object.keys(operationsByOid);
		oids.forEach((oid) => {
			const familyCache = this.documentFamilyCaches.get(oid);
			if (familyCache) {
				this.log(
					'adding',
					info.confirmed ? 'confirmed' : 'unconfirmed',
					'operations to cache',
					oid,
					operationsByOid[oid].length,
				);
				if (info.isLocal) {
					familyCache.insertLocalOperations(operationsByOid[oid]);
				} else {
					familyCache.insertOperations(operationsByOid[oid], info);
				}
			}
		});
	};

	private addBaselinesToOpenCaches = async (
		baselines: DocumentBaseline[],
		info: { isLocal: boolean },
	) => {
		const baselinesByOid = groupBaselinesByRootOid(baselines);
		const oids = Object.keys(baselinesByOid);
		oids.forEach((oid) => {
			const cache = this.documentFamilyCaches.get(oid);
			if (cache) {
				this.log(
					'adding',
					'baselines to cache',
					oid,
					baselinesByOid[oid].length,
				);
				cache.insertBaselines(baselinesByOid[oid], info);
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
		operations: TaggedOperation[];
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
				familyCache.addData({
					operations: operationsByDocumentOid[oid] || [],
					baselines: baselinesByDocumentOid[oid] || [],
					reset,
					isLocal,
				});
				this.log(
					'debug',
					'Added data to cache for',
					oid,
					operationsByDocumentOid[oid]?.length ?? 0,
					'operations',
					baselinesByDocumentOid[oid]?.length ?? 0,
					'baselines',
				);
			} else {
				this.log(
					'debug',
					'Could not add data to cache for',
					oid,
					'because it is not open',
				);
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
		// convert operations to tagged operations with confirmed = false
		// while we process and store them. this is in-place so as to
		// not allocate a bunch of objects...
		const taggedOperations = operations as TaggedOperation[];
		for (const op of taggedOperations) {
			op.confirmed = false;
		}

		let allDocumentOids: string[] = [];
		// in a reset scenario, it only makes things confusing if we
		// optimistically apply incoming operations, since the local
		// history is out of sync
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
			allDocumentOids = Array.from(
				new Set(
					baselines
						.map((b) => getOidRoot(b.oid))
						.concat(operations.map((o) => getOidRoot(o.oid))),
				),
			);
		} else {
			// first, synchronously add data to any open caches for immediate change propagation
			allDocumentOids = this.addDataToOpenCaches({
				operations: taggedOperations,
				baselines,
				reset,
			});
		}

		// then, asynchronously add data to storage
		await this.meta.insertRemoteBaselines(baselines);
		await this.meta.insertRemoteOperations(operations);

		if (reset) {
			await this.refreshAllCaches(true);
		}

		// recompute all affected documents for querying
		for (const oid of allDocumentOids) {
			await this.writeDocumentToStorage(oid);
		}

		// notify active queries
		const affectedCollections = Array.from(
			new Set<string>(
				allDocumentOids.map((oid) => decomposeOid(oid).collection),
			),
		);
		this.context.log('changes to collections', affectedCollections);
		this.context.entityEvents.emit('collectionsChanged', affectedCollections);
	};

	addLocalOperations = async (operations: Operation[]) => {
		this.log('Adding local operations', operations.length);
		this.addOperationsToOpenCaches(operations, {
			isLocal: true,
			confirmed: false,
		});
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
			flush: async () => {
				// before running a batch, the default operations must be flushed
				// this better preserves undo history behavior...
				// if we left the default batch open while flushing a named batch,
				// then the default batch would be flushed after the named batch,
				// and the default batch could contain operations both prior and
				// after the named batch. this would result in a confusing undo
				// history where the first undo might reverse changes before and
				// after a set of other changes.
				await this.operationBatcher.flush(DEFAULT_BATCH_KEY);
				return internalBatch.flush();
			},
			discard: () => {
				this.operationBatcher.discard(batchName);
			},
		};
		return externalApi;
	};

	/**
	 * @deprecated use `batch` instead
	 */
	flushPatches = async () => {
		await this.operationBatcher.flush(this.currentBatchKey);
	};

	flushAllBatches = async () => {
		await Promise.all(this.operationBatcher.flushAll());
	};

	private flushOperations = async (
		operations: Operation[],
		batchKey: string,
		meta: { undoable?: boolean },
	) => {
		if (!operations.length) return;

		this.log('Flushing operations', operations.length, 'to storage / sync');
		// rewrite timestamps of all operations to now - this preserves
		// the linear history of operations which are sent to the server.
		// even if multiple batches are spun up in parallel and flushed
		// after delay, the final operations in each one should reflect
		// when the batch flushed, not when the changes were made.
		// This also corresponds to user-observed behavior, since unconfirmed
		// operations are applied universally after confirmed operations locally,
		// so even operations which were made before a remote operation but
		// have not been confirmed yet will appear to come after the remote one
		// despite the provisional timestamp being earlier (see DocumentFamilyCache#computeView)
		for (const op of operations) {
			op.timestamp = this.meta.now;
		}
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

		// confirm the operations
		this.addDataToOpenCaches({ operations, baselines: [] });

		// recompute all affected documents for querying
		const allDocumentOids = Array.from(
			new Set(operations.map((op) => getOidRoot(op.oid))),
		);
		for (const oid of allDocumentOids) {
			await this.writeDocumentToStorage(oid);
		}

		// TODO: find a more efficient and straightforward way to update affected
		// queries. Move to Metadata?
		const affectedCollections = new Set(
			operations.map(({ oid }) => decomposeOid(oid).collection),
		);
		this.context.log('changes to collections', affectedCollections);
		this.context.entityEvents.emit(
			'collectionsChanged',
			Array.from(affectedCollections),
		);
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

	delete = async (oid: ObjectIdentifier, options?: { undoable?: boolean }) => {
		assert(
			oid === getOidRoot(oid),
			'Only root documents may be deleted via client methods',
		);
		// we need to get all sub-object oids to delete alongside the root
		const allOids = await this.meta.getAllDocumentRelatedOids(oid);
		const patches = this.meta.patchCreator.createDeleteAll(allOids);
		// don't enqueue these, submit as distinct operation
		await this.submitOperations(patches, options);
	};

	deleteAll = async (
		oids: ObjectIdentifier[],
		options?: { undoable?: boolean },
	) => {
		const allOids = await Promise.all(
			oids.map((oid) => this.meta.getAllDocumentRelatedOids(oid)),
		);
		const patches = this.meta.patchCreator.createDeleteAll(allOids.flat());
		// don't enqueue these, submit as distinct operation
		await this.submitOperations(patches, options);
	};

	reset = async () => {
		this.context.log('warn', 'Resetting local database');
		await this.resetStoredDocuments();
		await this.refreshAllCaches(true);
		// this.context.entityEvents.emit(
		// 	'collectionsChanged',
		// 	Object.keys(this.schema.collections),
		// );
	};

	destroy = () => {
		this._disposed = true;
		for (const unsubscribe of this.unsubscribes) {
			unsubscribe();
		}
		for (const cache of this.documentFamilyCaches.values()) {
			cache.dispose();
		}
		this.documentFamilyCaches.clear();
	};

	private handleRebase = (baselines: DocumentBaseline[]) => {
		this.log('debug', 'Reacting to rebases', baselines.length);
		// update any open caches with new baseline. this will automatically
		// drop operations before the baseline.
		this.addBaselinesToOpenCaches(baselines, { isLocal: true });
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

	private refreshAllCaches = async (dropUnconfirmed = false) => {
		for (const [_, cache] of this.documentFamilyCaches) {
			await this.refreshFamilyCache(cache, dropUnconfirmed);
		}
	};
}
