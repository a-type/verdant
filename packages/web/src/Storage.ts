import { Migration, SchemaCollection, StorageSchema } from '@lo-fi/common';
import { NoSync, ServerSync, ServerSyncOptions, Sync } from './Sync.js';
import { Metadata } from './metadata/Metadata.js';
import { QueryMaker } from './QueryMaker.js';
import { QueryStore } from './QueryStore.js';
import { openDocumentDatabase } from './openDocumentDatabase.js';
import { DocumentManager } from './DocumentManager.js';
import { EntityStore } from './reactives/EntityStore.js';
import { getSizeOfObjectStore } from './idb.js';
import { openMetadataDatabase } from './metadata/openMetadataDatabase.js';
import { UndoHistory } from './UndoHistory.js';

interface StorageComponents {
	meta: Metadata;
	documentDb: IDBDatabase;
	metaDb: IDBDatabase;
	undoHistory: UndoHistory;
}

interface StorageConfig {
	schema: StorageSchema;
	namespace: string;
	syncConfig?: ServerSyncOptions;
	log?: (...args: any[]) => void;
}

export class Storage {
	readonly entities;
	readonly queryStore;
	readonly queryMaker;
	readonly documentManager;

	readonly collectionNames: string[];

	readonly sync: Sync;

	constructor(
		private config: StorageConfig,
		private components: StorageComponents,
	) {
		this.entities = new EntityStore({
			db: this.documentDb,
			schema: this.schema,
			meta: this.meta,
			undoHistory: this.undoHistory,
			log: this.config.log,
		});
		this.queryStore = new QueryStore(this.documentDb, this.entities, {
			log: this.config.log,
		});
		this.queryMaker = new QueryMaker(this.queryStore, this.schema);
		this.documentManager = new DocumentManager(
			this.meta,
			this.schema,
			this.entities,
		);
		this.collectionNames = Object.keys(config.schema.collections);

		this.sync = config.syncConfig
			? new ServerSync(config.syncConfig, {
					meta: this.meta,
					entities: this.entities,
					log: this.config.log,
			  })
			: new NoSync();

		// self-assign collection shortcuts. these are not typed
		// here but are typed in the generated code...
		for (const [name, _collection] of Object.entries(
			config.schema.collections,
		)) {
			const collection = _collection as SchemaCollection<any, any>;
			const collectionName = collection.pluralName ?? collection.name + 's';
			// @ts-ignore
			this[collectionName] = {
				/** @deprecated - use put */
				create: (doc: any) => this.documentManager.create(name, doc),
				put: (doc: any) => this.documentManager.create(name, doc),
				delete: (id: string) => this.documentManager.delete(name, id),
				deleteAll: (ids: string[]) =>
					this.documentManager.deleteAll(ids.map((id) => [name, id])),
				get: (id: string) => this.queryMaker.get(name, id),
				findOne: (query: any) => this.queryMaker.findOne(name, query),
				findAll: (query: any) => this.queryMaker.findAll(name, query),
			};
		}
	}

	get meta() {
		return this.components.meta;
	}

	get documentDb() {
		return this.components.documentDb;
	}

	get schema() {
		return this.config.schema;
	}

	get namespace() {
		return this.config.namespace;
	}

	get undoHistory() {
		return this.components.undoHistory;
	}

	/**
	 * @deprecated - use client.sync.presence instead
	 */
	get presence() {
		return this.sync.presence;
	}

	/**
	 * @deprecated - use put
	 */
	create: this['documentManager']['create'] = async (...args) => {
		return this.documentManager.create(...args);
	};

	put: this['documentManager']['create'] = async (...args) => {
		return this.documentManager.create(...args);
	};

	delete: this['documentManager']['delete'] = async (...args) => {
		return this.documentManager.delete(...args);
	};

	get: this['queryMaker']['get'] = (...args) => {
		return this.queryMaker.get(...args);
	};

	findOne: this['queryMaker']['findOne'] = (...args) => {
		return this.queryMaker.findOne(...args);
	};

	findAll: this['queryMaker']['findAll'] = (...args) => {
		return this.queryMaker.findAll(...args);
	};

	stats = async () => {
		const collectionNames = Object.keys(this.schema.collections);
		let collections = {} as Record<string, { count: number; size: number }>;
		for (const collectionName of collectionNames) {
			collections[collectionName] = await getSizeOfObjectStore(
				this.documentDb,
				collectionName,
			);
		}
		const meta = await this.meta.stats();
		const storage =
			typeof navigator !== 'undefined' &&
			typeof navigator.storage !== 'undefined' &&
			'estimate' in navigator.storage
				? await navigator.storage.estimate()
				: undefined;

		// determine data:metadata ratio for total size of all collections vs metadata
		const totalCollectionsSize = Object.values(collections).reduce(
			(acc, { size }) => acc + size,
			0,
		);
		const totalMetaSize = meta.baselinesSize.size + meta.operationsSize.size;
		const metaToDataRatio = totalMetaSize / totalCollectionsSize;

		return {
			collections,
			meta,
			storage,
			totalMetaSize,
			totalCollectionsSize,
			metaToDataRatio,
			quotaUsage:
				storage?.usage && storage?.quota
					? storage.usage / storage.quota
					: undefined,
		};
	};

	close = () => {
		this.sync.stop();
		this.sync.dispose();

		this.queryStore.destroy();
		this.entities.destroy();

		this.documentDb.close();
		this.components.metaDb.close();
	};

	__dangerous__resetLocal = async () => {
		this.sync.stop();
		const req1 = indexedDB.deleteDatabase([this.namespace, 'meta'].join('_'));
		const req2 = indexedDB.deleteDatabase(
			[this.namespace, 'collections'].join('_'),
		);
		await Promise.all([
			new Promise((resolve, reject) => {
				req1.onsuccess = resolve;
				req1.onerror = reject;
			}),
			new Promise((resolve, reject) => {
				req2.onsuccess = resolve;
				req2.onerror = reject;
			}),
		]);
		window.location.reload();
	};
}

export interface StorageInitOptions<Schema extends StorageSchema<any>> {
	/** The schema used to create this client */
	schema: Schema;
	/** Migrations, in order, to upgrade to each successive version of the schema */
	migrations: Migration[];
	/** Provide a sync config to turn on synchronization with a server */
	sync?: ServerSyncOptions;
	/** Optionally override the IndexedDB implementation */
	indexedDb?: IDBFactory;
	/**
	 * Namespaces are used to separate data from different clients in IndexedDB.
	 */
	namespace: string;
	/**
	 * Provide your own UndoHistory to have a unified undo system across multiple
	 * clients if you so desire.
	 */
	undoHistory?: UndoHistory;
	/**
	 * Provide a log function to log internal debug messages
	 */
	log?: (...args: any[]) => void;
	/**
	 * If existing storage does not exist, you can provide this function to initialize it.
	 * Initialization will complete before the open() request resolves. The function
	 * is called with the client instance.
	 */
	loadInitialData?: (client: Storage) => Promise<void>;
}

/**
 * Since storage initialization is async, this class wraps the core
 * Storage creation promise and exposes some metadata which can
 * be useful immediately.
 */
export class StorageDescriptor<Schema extends StorageSchema<any>> {
	private readonly _readyPromise: Promise<Storage>;
	// assertions because these are defined by plucking them from
	// Promise initializer
	private resolveReady!: (storage: Storage) => void;
	private rejectReady!: (err: Error) => void;
	private _resolvedValue: Storage | undefined;
	private _initializing = false;
	private _namespace: string;

	get namespace() {
		return this._namespace;
	}

	constructor(private readonly init: StorageInitOptions<Schema>) {
		this._readyPromise = new Promise((resolve, reject) => {
			this.resolveReady = resolve;
			this.rejectReady = reject;
		});
		this._namespace = init.namespace;
	}

	private initialize = async (init: StorageInitOptions<Schema>) => {
		if (this._initializing) {
			return this._readyPromise;
		}
		this._initializing = true;
		try {
			const metaDbName = [init.namespace, 'meta'].join('_');
			const isFirstTimeInitialization = await (init.indexedDb || indexedDB)
				.databases()
				.then((databases) => {
					return !databases.find((db) => db.name === metaDbName);
				});

			const metaDb = await openMetadataDatabase(this._namespace, {
				indexedDB: init.indexedDb,
				log: init.log,
				databaseName: metaDbName,
			});
			const meta = new Metadata(metaDb, init.schema, { log: init.log });

			// verify schema integrity
			await meta.updateSchema(init.schema);

			const documentDb = await openDocumentDatabase({
				namespace: this._namespace,
				schema: init.schema,
				meta,
				migrations: init.migrations,
				indexedDB: init.indexedDb,
				log: init.log,
			});

			const storage = new Storage(
				{
					schema: init.schema,
					namespace: this._namespace,
					syncConfig: init.sync,
					log: init.log,
				},
				{
					meta,
					metaDb,
					documentDb,
					undoHistory: init.undoHistory || new UndoHistory(),
				},
			);

			if (isFirstTimeInitialization && init.loadInitialData) {
				await init.loadInitialData(storage);
			}

			this.resolveReady(storage);
			this._resolvedValue = storage;
			return storage;
		} catch (err) {
			this.rejectReady(err as Error);
			throw err;
		} finally {
			this._initializing = false;
		}
	};

	get current() {
		// exposing an immediate value if already resolved lets us
		// skip the promise microtask when accessing this externally if
		// the initialization has been completed.
		return this._resolvedValue;
	}

	get readyPromise() {
		return this._readyPromise;
	}

	get schema() {
		return this.init.schema;
	}

	open = () => this.initialize(this.init);

	close = async () => {
		if (this._resolvedValue) {
			this._resolvedValue.close();
		}
		if (this._initializing) {
			(await this._readyPromise).close();
		}
	};
}
