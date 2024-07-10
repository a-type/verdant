import {
	EventSubscriber,
	Migration,
	Operation,
	StorageSchema,
	hashObject,
} from '@verdant-web/common';
import { Context } from '../context.js';
import { FileManagerConfig } from '../files/FileManager.js';
import { Metadata } from '../metadata/Metadata.js';
import {
	openMetadataDatabase,
	openWIPMetadataDatabase,
} from '../metadata/openMetadataDatabase.js';
import { openWIPDatabase } from '../migration/openWIPDatabase.js';
import { ServerSyncOptions } from '../sync/Sync.js';
import { UndoHistory } from '../UndoHistory.js';
import { Client } from './Client.js';
import {
	deleteAllDatabases,
	deleteDatabase,
	getAllDatabaseNamesAndVersions,
} from '../idb.js';
import { FakeWeakRef } from '../FakeWeakRef.js';
import { METADATA_VERSION_KEY } from './constants.js';
import { openQueryDatabase } from '../migration/openQueryDatabase.js';

export interface ClientDescriptorOptions<Presence = any, Profile = any> {
	/** The schema used to create this client */
	schema: StorageSchema<any>;
	oldSchemas?: StorageSchema<any>[];
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
	log?: (
		level: 'debug' | 'info' | 'warn' | 'error' | 'critical',
		...args: any[]
	) => void;
	disableRebasing?: boolean;
	/**
	 * Provide a specific schema number to override the schema version
	 * in the database. This is useful for testing migrations or recovering
	 * from a mistakenly deployed incorrect schema. A specific version is required
	 * so that you don't leave this on accidentally for all new schemas.
	 */
	overrideSchemaConflict?: number;
	/**
	 * Configuration for file management
	 */
	files?: FileManagerConfig;

	/**
	 * Listen for operations as they are applied to the database.
	 * Wouldn't recommend using this unless you know what you're doing.
	 * It's a very hot code path...
	 */
	onOperation?: (operation: Operation) => void;
	/**
	 * Enables experimental WeakRef usage to cull documents
	 * from cache that aren't being used. This is a performance
	 * optimization which has been tested under all Verdant's test
	 * suites but I still want to keep testing it in the real world
	 * before turning it on.
	 */
	EXPERIMENTAL_weakRefs?: boolean;

	// not for public use
	[METADATA_VERSION_KEY]?: number;
}

/**
 * Since storage initialization is async, this class wraps the core
 * Storage creation promise and exposes some metadata which can
 * be useful immediately.
 */
export class ClientDescriptor<
	Presence = any,
	Profile = any,
	ClientImpl extends Client = Client,
> {
	private readonly _readyPromise: Promise<ClientImpl>;
	// assertions because these are defined by plucking them from
	// Promise initializer
	private resolveReady!: (storage: ClientImpl) => void;
	private rejectReady!: (err: Error) => void;
	private _resolvedValue: ClientImpl | undefined;
	private _initializing = false;
	private _namespace: string;

	get namespace() {
		return this._namespace;
	}

	constructor(
		private readonly init: ClientDescriptorOptions<Presence, Profile>,
	) {
		this._readyPromise = new Promise((resolve, reject) => {
			this.resolveReady = resolve;
			this.rejectReady = reject;
		});
		this._namespace = init.namespace;
	}

	private initialize = async (init: ClientDescriptorOptions) => {
		// if server-side and no alternative IndexedDB implementation was provided,
		// we can't initialize the storage
		if (typeof window === 'undefined' && !init.indexedDb) {
			throw new Error(
				'A verdant client was initialized in an environment without IndexedDB. If you are using verdant in a server-rendered framework, you must enforce that all clients are initialized on the client-side, or you must provide some mock interface of IDBFactory to the ClientDescriptor options.',
			);
		}

		if (this._initializing || this._resolvedValue) {
			return this._readyPromise;
		}
		this._initializing = true;
		try {
			let storage: ClientImpl;
			if (init.schema.wip) {
				storage = await this.initializeWIPDatabases(init);
			} else {
				storage = await this.initializeDatabases(init);
				this.cleanupWIPDatabases(init);
			}

			this.resolveReady(storage);
			this._resolvedValue = storage;
			return storage;
		} catch (err) {
			if (err instanceof Error) {
				this.rejectReady(err as Error);
				throw err;
			} else {
				throw new Error('Unknown error initializing storage');
			}
		} finally {
			this._initializing = false;
		}
	};

	private initializeDatabases = async (init: ClientDescriptorOptions) => {
		const metadataVersion = init[METADATA_VERSION_KEY];
		const { db: metaDb } = await openMetadataDatabase({
			indexedDB: init.indexedDb,
			log: init.log,
			namespace: init.namespace,
			metadataVersion,
		});

		const context: Omit<Context, 'documentDb' | 'getNow'> = {
			namespace: this._namespace,
			metaDb,
			schema: init.schema,
			log: init.log || (() => {}),
			undoHistory: init.undoHistory || new UndoHistory(),
			entityEvents: new EventSubscriber(),
			globalEvents: new EventSubscriber(),
			internalEvents: new EventSubscriber(),
			weakRef: (value) => {
				if (init.EXPERIMENTAL_weakRefs) {
					return new WeakRef(value);
				} else {
					return new FakeWeakRef(value) as unknown as WeakRef<typeof value>;
				}
			},
			migrations: init.migrations,
			oldSchemas: init.oldSchemas,
		};
		const meta = new Metadata({
			context,
			disableRebasing: init.disableRebasing,
			onOperation: init.onOperation,
		});

		// verify schema integrity
		await meta.updateSchema(init.schema, init.overrideSchemaConflict);

		const contextWithNow: Omit<Context, 'documentDb'> = Object.assign(context, {
			getNow: () => meta.now,
		});

		const documentDb = await openQueryDatabase({
			context: contextWithNow,
			version: init.schema.version,
			meta,
			migrations: init.migrations,
			indexedDB: init.indexedDb,
		});

		const fullContext: Context = Object.assign(contextWithNow, { documentDb });

		const storage = new Client(
			{
				syncConfig: init.sync,
				migrations: init.migrations,
				files: init.files,
			},
			fullContext,
			{
				meta,
			},
		) as ClientImpl;

		return storage;
	};

	private initializeWIPDatabases = async (init: ClientDescriptorOptions) => {
		const schemaHash = hashObject(init.schema);
		console.info(`WIP schema in use. Opening database with hash ${schemaHash}`);

		const wipNamespace = `@@wip_${init.namespace}_${schemaHash}`;
		const { db: metaDb } = await openWIPMetadataDatabase({
			indexedDB: init.indexedDb,
			log: init.log,
			namespace: init.namespace,
			wipNamespace: wipNamespace,
		});

		const context: Omit<Context, 'documentDb' | 'getNow'> = {
			namespace: this._namespace,
			metaDb,
			schema: init.schema,
			log: init.log || (() => {}),
			undoHistory: init.undoHistory || new UndoHistory(),
			entityEvents: new EventSubscriber(),
			globalEvents: new EventSubscriber(),
			internalEvents: new EventSubscriber(),
			weakRef: (value) => {
				if (init.EXPERIMENTAL_weakRefs) {
					return new WeakRef(value);
				} else {
					return new FakeWeakRef(value) as unknown as WeakRef<typeof value>;
				}
			},
			migrations: init.migrations,
			oldSchemas: init.oldSchemas,
		};
		const meta = new Metadata({
			context,
			disableRebasing: init.disableRebasing,
		});

		const contextWithNow: Omit<Context, 'documentDb'> = Object.assign(context, {
			getNow: () => meta.now,
		});

		// verify schema integrity
		await meta.updateSchema(init.schema, init.overrideSchemaConflict);

		const documentDb = await openWIPDatabase({
			context: contextWithNow,
			version: init.schema.version,
			meta,
			migrations: init.migrations,
			indexedDB: init.indexedDb,
			wipNamespace,
		});

		const fullContext: Context = Object.assign(contextWithNow, { documentDb });

		const storage = new Client(
			{
				syncConfig: init.sync,
				migrations: init.migrations,
				files: init.files,
			},
			fullContext,
			{
				meta,
			},
		) as ClientImpl;

		return storage;
	};

	private cleanupWIPDatabases = async (init: ClientDescriptorOptions) => {
		const databaseInfo = await getAllDatabaseNamesAndVersions(init.indexedDb);
		const wipDatabases = databaseInfo
			.filter((db) => db.name?.startsWith('@@wip_'))
			.map((db) => db.name!);
		// don't clear a current WIP database.
		const wipDatabasesToDelete = wipDatabases.filter(
			(db) =>
				!db.startsWith(`@@wip_${init.namespace}_${hashObject(init.schema)}`),
		);
		for (const db of wipDatabasesToDelete) {
			await deleteDatabase(db, init.indexedDb);
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

	__dangerous__resetLocal = async () => {
		await deleteAllDatabases(this.namespace);
	};
}
