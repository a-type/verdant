import { EventSubscriber, Migration, StorageSchema } from '@verdant-web/common';
import { Context } from '../context.js';
import { FileManagerConfig } from '../files/FileManager.js';
import { Metadata } from '../metadata/Metadata.js';
import { openMetadataDatabase } from '../metadata/openMetadataDatabase.js';
import { openDocumentDatabase } from '../migration/openDatabase.js';
import { ServerSyncOptions } from '../sync/Sync.js';
import { UndoHistory } from '../UndoHistory.js';
import { Client } from './Client.js';
import { deleteAllDatabases } from '../idb.js';

export interface ClientDescriptorOptions<Presence = any, Profile = any> {
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
}

/**
 * Since storage initialization is async, this class wraps the core
 * Storage creation promise and exposes some metadata which can
 * be useful immediately.
 */
export class ClientDescriptor<Presence = any, Profile = any> {
	private readonly _readyPromise: Promise<Client>;
	// assertions because these are defined by plucking them from
	// Promise initializer
	private resolveReady!: (storage: Client) => void;
	private rejectReady!: (err: Error) => void;
	private _resolvedValue: Client | undefined;
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
				entityEvents: new EventSubscriber(),
				globalEvents: new EventSubscriber(),
			};
			const meta = new Metadata({
				context,
				disableRebasing: init.disableRebasing,
			});

			// verify schema integrity
			await meta.updateSchema(init.schema, init.overrideSchemaConflict);

			const documentDb = await openDocumentDatabase({
				context,
				version: init.schema.version,
				meta,
				migrations: init.migrations,
				indexedDB: init.indexedDb,
			});

			const fullContext: Context = Object.assign(context, { documentDb });

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

	__dangerous__resetLocal = async () => {
		await deleteAllDatabases(this.namespace);
	};
}
