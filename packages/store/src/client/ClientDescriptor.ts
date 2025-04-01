import {
	EventSubscriber,
	HybridLogicalClockTimestampProvider,
	Migration,
	PatchCreator,
	StorageSchema,
	VerdantError,
} from '@verdant-web/common';
import { FileConfig, InitialContext, QueryConfig } from '../context/context.js';
import { ShutdownHandler } from '../context/ShutdownHandler.js';
import { Time } from '../context/Time.js';
import { FakeWeakRef } from '../FakeWeakRef.js';
import { debugLogger, noLogger, VerdantLogger } from '../logger.js';
import { IdbPersistence } from '../persistence/idb/idbPersistence.js';
import { deleteAllDatabases } from '../persistence/idb/util.js';
import { PersistenceImplementation } from '../persistence/interfaces.js';
import { initializePersistence } from '../persistence/persistence.js';
import { ServerSyncOptions } from '../sync/Sync.js';
import { UndoHistory } from '../UndoHistory.js';
import { Client } from './Client.js';

export interface ClientDescriptorOptions<Presence = any, Profile = any> {
	/** The schema used to create this client */
	schema: StorageSchema<any>;
	oldSchemas: StorageSchema<any>[];
	/** Migrations, in order, to upgrade to each successive version of the schema */
	migrations: Migration<any>[];
	/** Provide a sync config to turn on synchronization with a server */
	sync?: ServerSyncOptions<Profile, Presence>;
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
	log?: VerdantLogger | false;
	disableRebasing?: boolean;
	rebaseTimeout?: number;
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
	files?: FileConfig;

	/**
	 * Override the default IndexedDB persistence implementation.
	 */
	persistence?: PersistenceImplementation;

	/**
	 * Specify the environment dependencies needed for the client.
	 * Normally these are provided by the browser, but in other
	 * runtimes you may need to provide your own.
	 */
	environment?: InitialContext['environment'];

	/**
	 * Enables experimental WeakRef usage to cull documents
	 * from cache that aren't being used. This is a performance
	 * optimization which has been tested under all Verdant's test
	 * suites but I still want to keep testing it in the real world
	 * before turning it on.
	 */
	EXPERIMENTAL_weakRefs?: boolean;

	/**
	 * Customize querying behavior.
	 */
	queries?: QueryConfig;
}

/**
 * Since storage initialization is async, this class wraps the core
 * Storage creation promise and exposes some metadata which can
 * be useful immediately.
 */
export class ClientDescriptor<
	Presence = any,
	Profile = any,
	ClientImpl extends Client = Client<Presence, Profile>,
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
		if (typeof window === 'undefined' && !init.environment) {
			throw new Error(
				'A Verdant client was initialized in an environment without a global Window or `environment` configuration. If you are using verdant in a server-rendered framework, you must enforce that all clients are initialized on the client-side, or you must provide some mock interface of the environment to the ClientDescriptor options.',
			);
		}

		if (this._initializing || this._resolvedValue) {
			return this._readyPromise;
		}
		this._initializing = true;
		try {
			const time = new Time(
				new HybridLogicalClockTimestampProvider(),
				init.schema.version,
			);
			const environment = init.environment || defaultBrowserEnvironment;
			const logger =
				init.log === false ? noLogger : init.log || debugLogger('🌿');
			let ctx: InitialContext = {
				closing: false,
				entityEvents: new EventSubscriber(),
				globalEvents: new EventSubscriber(),
				internalEvents: new EventSubscriber(),
				log: logger,
				migrations: init.migrations,
				namespace: init.namespace,
				originalNamespace: init.namespace,
				schema: init.schema,
				oldSchemas: init.oldSchemas,
				time,
				undoHistory: init.undoHistory || new UndoHistory(),
				weakRef: (val) =>
					init.EXPERIMENTAL_weakRefs
						? new WeakRef(val)
						: (new FakeWeakRef(val) as any),
				patchCreator: new PatchCreator(() => time.now),
				config: {
					files: init.files,
					sync: init.sync,
					persistence: {
						disableRebasing: init.disableRebasing,
						rebaseTimeout: init.rebaseTimeout,
					},
					queries: init.queries,
				},
				persistence:
					init.persistence || new IdbPersistence(environment.indexedDB),
				environment,
				persistenceShutdownHandler: new ShutdownHandler(logger),
				pauseRebasing: false,
				getClient() {
					throw new VerdantError(
						VerdantError.Code.Unexpected,
						undefined,
						'Client not yet initialized. This is a Verdant bug, please report it.',
					);
				},
			};
			ctx.log('info', 'Initializing client', {
				namespace: ctx.namespace,
				version: init.schema.version,
				persistence: ctx.persistence.name,
			});
			const context = await initializePersistence(ctx);
			const client = new Client(context) as ClientImpl;
			this.resolveReady(client);
			this._resolvedValue = client;
			return client;
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

const defaultBrowserEnvironment = {
	WebSocket: typeof WebSocket !== 'undefined' ? WebSocket : (undefined as any),
	fetch: typeof window !== 'undefined' ? window.fetch.bind(window) : fetch!,
	indexedDB: typeof indexedDB !== 'undefined' ? indexedDB : (undefined as any),
};
