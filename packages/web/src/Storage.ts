import { Migration, SchemaCollection, StorageSchema } from '@lo-fi/common';
import { NoSync, ServerSync, ServerSyncOptions, Sync } from './Sync.js';
import { ExportData, Metadata } from './metadata/Metadata.js';
import { LiveQueryMaker } from './queries/LiveQueryMaker.js';
import { LiveQueryStore } from './queries/LiveQueryStore.js';
import { openDocumentDatabase } from './openDocumentDatabase.js';
import { DocumentManager } from './DocumentManager.js';
import { EntityStore } from './reactives/EntityStore.js';
import { closeDatabase, getSizeOfObjectStore } from './idb.js';
import { openMetadataDatabase } from './metadata/openMetadataDatabase.js';
import { UndoHistory } from './UndoHistory.js';
import { Context } from './context.js';

interface StorageConfig<Presence = any> {
	syncConfig?: ServerSyncOptions<Presence>;
	migrations: Migration[];
	log?: (...args: any[]) => void;
}

export class Storage {
	readonly meta: Metadata;
	private _entities!: EntityStore;
	private _queryStore!: LiveQueryStore;
	private _queryMaker!: LiveQueryMaker;
	private _documentManager!: DocumentManager<any>;

	readonly collectionNames: string[];

	private _sync!: Sync;

	get queryMaker() {
		return this._queryMaker;
	}

	get sync() {
		return this._sync;
	}

	get entities() {
		return this._entities;
	}

	get queryStore() {
		return this._queryStore;
	}

	get documentManager() {
		return this._documentManager;
	}

	constructor(
		private config: StorageConfig,
		private context: Context,
		components: { meta: Metadata },
	) {
		this.meta = components.meta;
		this.collectionNames = Object.keys(context.schema.collections);
		this.initialize();

		// self-assign collection shortcuts. these are not typed
		// here but are typed in the generated code...
		for (const [name, _collection] of Object.entries(
			context.schema.collections,
		)) {
			const collection = _collection as SchemaCollection<any, any>;
			const collectionName = collection.pluralName ?? collection.name + 's';
			// @ts-ignore
			this[collectionName] = {
				/** @deprecated - use put */
				create: (doc: any) => this._documentManager.create(name, doc),
				put: (doc: any) => this._documentManager.create(name, doc),
				delete: (id: string) => this._documentManager.delete(name, id),
				deleteAll: (ids: string[]) =>
					this._documentManager.deleteAll(ids.map((id) => [name, id])),
				get: (id: string) => this._queryMaker.get(name, id),
				findOne: (query: any) => this._queryMaker.findOne(name, query),
				findAll: (query: any) => this._queryMaker.findAll(name, query),
			};
		}
	}

	private initialize = () => {
		this._entities = new EntityStore({
			context: this.context,
			meta: this.meta,
		});
		this._queryStore = new LiveQueryStore(this._entities, this.context);
		this._queryMaker = new LiveQueryMaker(this._queryStore, this.context);
		this._documentManager = new DocumentManager(
			this.meta,
			this.schema,
			this._entities,
		);

		this._sync = this.config.syncConfig
			? new ServerSync(this.config.syncConfig, {
					meta: this.meta,
					entities: this._entities,
					log: this.config.log,
			  })
			: new NoSync();

		this.documentDb.addEventListener('versionchange', () => {
			this.config.log?.(
				`Another tab has requested a version change for ${this.namespace}`,
			);
			this.documentDb.close();
			if (typeof window !== 'undefined') {
				window.location.reload();
			}
		});

		this.metaDb.addEventListener('versionchange', () => {
			this.config.log?.(
				`Another tab has requested a version change for ${this.namespace}`,
			);
			this.metaDb.close();
			if (typeof window !== 'undefined') {
				window.location.reload();
			}
		});
	};

	get documentDb() {
		return this.context.documentDb;
	}

	get metaDb() {
		return this.context.metaDb;
	}

	get schema() {
		return this.context.schema;
	}

	get namespace() {
		return this.context.namespace;
	}

	get undoHistory() {
		return this.context.undoHistory;
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
	create: DocumentManager<any>['create'] = async (...args) => {
		return this._documentManager.create(...args);
	};

	put: DocumentManager<any>['create'] = async (...args) => {
		return this._documentManager.create(...args);
	};

	delete: DocumentManager<any>['delete'] = async (...args) => {
		return this._documentManager.delete(...args);
	};

	get: LiveQueryMaker['get'] = (...args) => {
		return this._queryMaker.get(...args);
	};

	findOne: LiveQueryMaker['findOne'] = (...args) => {
		return this._queryMaker.findOne(...args);
	};

	findAll: LiveQueryMaker['findAll'] = (...args) => {
		return this._queryMaker.findAll(...args);
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

	close = async () => {
		this.sync.stop();
		this.sync.dispose();

		this.meta.close();

		this._queryStore.destroy();
		this._entities.destroy();

		await closeDatabase(this.documentDb);
		await closeDatabase(this.metaDb);

		this.config.log?.('Client closed');
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

	export = async () => {
		const metaExport = await this.meta.export();
		return Buffer.from(JSON.stringify(metaExport));
	};

	import = async (buffer: Buffer) => {
		this.context.log('Importing data...');
		// close the document DB
		await closeDatabase(this.context.documentDb);

		const metaExport = JSON.parse(buffer.toString()) as ExportData;
		await this.meta.resetFrom(metaExport);
		// now reset the document DB to the specified version
		// and run migrations to get it to the latest version
		const version = metaExport.schema.version;
		const deleteReq = indexedDB.deleteDatabase(
			[this.namespace, 'collections'].join('_'),
		);
		await new Promise((resolve, reject) => {
			deleteReq.onsuccess = resolve;
			deleteReq.onerror = reject;
		});
		// reset our context to the imported schema for now
		const currentSchema = this.context.schema;
		this.context.schema = metaExport.schema;
		// now open the document DB empty at the specified version
		// and initialize it from the meta DB
		this.context.documentDb = await openDocumentDatabase({
			meta: this.meta,
			migrations: this.config.migrations,
			context: this.context,
			version,
		});
		// re-initialize data
		this.context.log('Re-initializing data from imported data...');
		await this._entities.addData({
			operations: metaExport.operations,
			baselines: metaExport.baselines,
			reset: true,
		});
		// close the database and reopen to latest version, applying
		// migrations
		await closeDatabase(this.context.documentDb);
		this.context.log('Migrating up to latest schema...');
		// put the schema back
		this.context.schema = currentSchema;
		this.context.documentDb = await openDocumentDatabase({
			meta: this.meta,
			migrations: this.config.migrations,
			context: this.context,
			version: currentSchema.version,
		});
		// re-initialize query store
		this._queryStore.updateAll();
	};
}

export interface StorageInitOptions<Presence = any, Profile = any> {
	/** The schema used to create this client */
	schema: StorageSchema<any>;
	/** Migrations, in order, to upgrade to each successive version of the schema */
	migrations: Migration<any>[];
	/** Provide a sync config to turn on synchronization with a server */
	sync?: ServerSyncOptions<Profile, Presence>;
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
	disableRebasing?: boolean;
}

/**
 * Since storage initialization is async, this class wraps the core
 * Storage creation promise and exposes some metadata which can
 * be useful immediately.
 */
export class StorageDescriptor<Presence = any, Profile = any> {
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

	constructor(private readonly init: StorageInitOptions<Presence, Profile>) {
		this._readyPromise = new Promise((resolve, reject) => {
			this.resolveReady = resolve;
			this.rejectReady = reject;
		});
		this._namespace = init.namespace;
	}

	private initialize = async (init: StorageInitOptions) => {
		if (this._initializing) {
			return this._readyPromise;
		}
		this._initializing = true;
		try {
			const metaDbName = [init.namespace, 'meta'].join('_');
			const { db: metaDb } = await openMetadataDatabase(this._namespace, {
				indexedDB: init.indexedDb,
				log: init.log,
				databaseName: metaDbName,
			});

			const context: Omit<Context, 'documentDb'> = {
				namespace: this._namespace,
				metaDb,
				schema: init.schema,
				log: init.log || (() => {}),
				undoHistory: init.undoHistory || new UndoHistory(),
			};
			const meta = new Metadata({
				context,
				disableRebasing: init.disableRebasing,
			});

			// verify schema integrity
			await meta.updateSchema(init.schema);

			const documentDb = await openDocumentDatabase({
				context,
				version: init.schema.version,
				meta,
				migrations: init.migrations,
				indexedDB: init.indexedDb,
			});

			const fullContext: Context = Object.assign(context, { documentDb });

			const storage = new Storage(
				{
					syncConfig: init.sync,
					migrations: init.migrations,
				},
				fullContext,
				{
					meta,
				},
			);

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
