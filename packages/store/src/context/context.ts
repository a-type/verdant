import {
	ClientMessage,
	EventSubscriber,
	FileData,
	FileRef,
	HybridLogicalClockTimestampProvider,
	Migration,
	ObjectIdentifier,
	Operation,
	PatchCreator,
	StorageSchema,
	VerdantError,
} from '@verdant-web/common';
import { FakeWeakRef } from '../FakeWeakRef.js';
import { UndoHistory } from '../UndoHistory.js';
import type { Client } from '../client/Client.js';
import { debugLogger, noLogger, VerdantLogger } from '../logger.js';
import { PersistenceFiles } from '../persistence/PersistenceFiles.js';
import type { PersistenceMetadata } from '../persistence/PersistenceMetadata.js';
import type { PersistenceDocuments } from '../persistence/PersistenceQueries.js';
import { IdbPersistence } from '../persistence/idb/idbPersistence.js';
import {
	PersistedFileData,
	PersistenceImplementation,
} from '../persistence/interfaces.js';
import { initializePersistence } from '../persistence/persistence.js';
import { ServerSyncOptions } from '../sync/Sync.js';
import { ShutdownHandler } from './ShutdownHandler.js';
import { Time } from './Time.js';

export interface ContextEnvironment {
	WebSocket: typeof WebSocket;
	fetch: typeof fetch;
	indexedDB: typeof indexedDB;
	location: Location;
	history: History;
}

export const defaultBrowserEnvironment: ContextEnvironment = {
	WebSocket: typeof WebSocket !== 'undefined' ? WebSocket : (undefined as any),
	fetch: typeof window !== 'undefined' ? window.fetch.bind(window) : fetch!,
	indexedDB: typeof indexedDB !== 'undefined' ? indexedDB : (undefined as any),
	location:
		typeof window !== 'undefined' ? window.location : (undefined as any),
	history: typeof window !== 'undefined' ? window.history : (undefined as any),
};

export interface ContextInit {
	/** The schema used to create this client */
	schema: StorageSchema<any>;
	oldSchemas: StorageSchema<any>[];
	/** Migrations, in order, to upgrade to each successive version of the schema */
	migrations: Migration<any>[];
	/** Provide a sync config to turn on synchronization with a server */
	sync?: ServerSyncOptions;
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
	environment?: Partial<ContextEnvironment>;

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

	persistenceShutdownHandler?: ShutdownHandler;
}

/**
 * Common components utilized across various client
 * services.
 */
export class Context {
	namespace: string;
	/**
	 * when in WIP mode, namespace might be set to a temporary value. This will always point to the
	 * namespace the user passed in.
	 */
	originalNamespace: string;
	time: Time;

	// async initialized services
	get meta(): Promise<PersistenceMetadata> {
		return this.initializedPromise.then((init) => init.meta);
	}
	get documents(): Promise<PersistenceDocuments> {
		return this.initializedPromise.then((init) => init.documents);
	}
	get files(): Promise<PersistenceFiles> {
		return this.initializedPromise.then((init) => init.files);
	}

	undoHistory: UndoHistory;
	schema: StorageSchema;
	oldSchemas: StorageSchema[];
	log: VerdantLogger;
	entityEvents: EventSubscriber<{
		collectionsChanged: (names: string[]) => void;
		documentChanged: (oid: ObjectIdentifier) => void;
	}>;
	internalEvents: EventSubscriber<{
		/**
		 * Fired when persisted data changes fundamentally, like resetting to 0,
		 * or importing different data.
		 */
		persistenceReset: () => void;
		filesDeleted: (files: FileRef[]) => void;
		fileAdded: (file: FileData) => void;
		[ev: `fileUploaded:${string}`]: (file: FileData) => void;
		fileUploaded: (file: FileData) => void;
		outgoingSyncMessage: (message: ClientMessage) => void;
	}>;
	globalEvents: EventSubscriber<{
		/**
		 * A change from a future version of the application has been
		 * witnessed. These changes are not applied but it indicates
		 * the app has been updated and we should prompt the user
		 * to reload or have their app user manually reload.
		 *
		 * The parameter is the timestamp of the future change.
		 */
		futureSeen: (timestamp: string) => void;
		/**
		 * The server requested this replica reset its state
		 * completely. This can happen when the replica has
		 * been offline for too long and reconnects.
		 */
		resetToServer: () => void;
		/**
		 * An operation has been processed by the system. This could be a locally sourced
		 * operation or a remote operation from sync.
		 */
		operation: (operation: Operation) => void;
		/**
		 * Emitted when storage rebases history. This should never actually affect application behavior
		 * or stored data, but is useful for debugging and testing.
		 */
		rebase: () => void;
		fileSaved: (file: FileData) => void;
	}>;
	weakRef = <T extends object>(value: T): WeakRef<T> => {
		if (this.init.EXPERIMENTAL_weakRefs) {
			return new WeakRef(value);
		}
		return new FakeWeakRef(value) as any;
	};
	migrations: Migration<any>[];
	/** If this is present, any attempt to close the client should await it first. */
	closeLock?: Promise<void>;
	patchCreator: PatchCreator;
	persistenceShutdownHandler: ShutdownHandler;

	// state
	closing: boolean = false;
	pauseRebasing: boolean = false;

	config: {
		files?: FileConfig;
		sync?: SyncConfig;
		persistence?: PersistenceConfig;
		queries?: QueryConfig;
	};

	environment: ContextEnvironment;

	persistence: PersistenceImplementation;

	/**
	 * Must be defined by the Client once it exists. Attempts to use this before
	 * it's ready will rightfully throw an error.
	 */
	getClient = (): Client => {
		throw new VerdantError(
			VerdantError.Code.Unexpected,
			undefined,
			'Client not yet initialized. This is a Verdant bug, please report it.',
		);
	};

	constructor(
		private init: ContextInit,
		initPersistence?: ReturnType<typeof initializePersistence>,
	) {
		// if server-side and no alternative IndexedDB implementation was provided,
		// we can't initialize the storage
		if (typeof window === 'undefined' && !this.init.environment) {
			throw new Error(
				'A Verdant client was initialized in an environment without a global Window or `environment` configuration. If you are using verdant in a server-rendered framework, you must enforce that all clients are initialized on the client-side, or you must provide some mock interface of the environment to the ClientDescriptor options.',
			);
		}
		// set static values
		this.namespace = this.init.namespace;
		this.originalNamespace = this.init.namespace;
		this.time = new Time(
			new HybridLogicalClockTimestampProvider(),
			this.init.schema.version,
		);
		this.log =
			this.init.log === false ? noLogger : this.init.log || debugLogger('🌿');
		this.migrations = init.migrations;
		this.undoHistory = init.undoHistory || new UndoHistory();
		this.entityEvents = new EventSubscriber();
		this.internalEvents = new EventSubscriber();
		this.globalEvents = new EventSubscriber();
		this.schema = init.schema;
		this.oldSchemas = init.oldSchemas;
		this.patchCreator = new PatchCreator(() => this.time.now);
		this.persistenceShutdownHandler =
			init.persistenceShutdownHandler || new ShutdownHandler(this.log);
		this.config = {
			files: init.files,
			sync: init.sync,
			persistence: {
				disableRebasing: init.disableRebasing,
				rebaseTimeout: init.rebaseTimeout,
			},
			queries: init.queries,
		};
		this.environment = {
			...defaultBrowserEnvironment,
			...init.environment,
		};
		this.persistence =
			init.persistence || new IdbPersistence(this.environment.indexedDB);
		this.initializedPromise = initPersistence || initializePersistence(this);
		this.initializedPromise.then(() => {
			this.log('info', 'Persistence initialized');
		});
	}
	private initializedPromise;
	get waitForInitialization(): Promise<void> {
		return this.initializedPromise.then(() => {});
	}
	reinitialize = async (): Promise<void> => {
		this.initializedPromise = initializePersistence(this);
		await this.initializedPromise;
	};

	cloneWithOptions(options: Partial<ContextInit>): Context {
		const copy = new Context(
			{ ...this.init, ...options },
			this.initializedPromise,
		);
		return copy;
	}
}

export interface FileConfig {
	/**
	 * Override the heuristic for deciding when a deleted file can be cleaned up.
	 * By default this waits 3 days since deletion, then deletes the file data.
	 * If the file has been synchronized to a server, it could still be restored
	 * if the server has not yet deleted it.
	 */
	canCleanupDeletedFile?: (file: PersistedFileData) => boolean;
}

export interface ServerSyncEndpointProviderConfig {
	/**
	 * The location of the endpoint used to retrieve an
	 * authorization token for the client.
	 */
	authEndpoint?: string;
	/**
	 * A custom function to retrieve authorization
	 * data. Use whatever fetching mechanism you want.
	 */
	fetchAuth?: () => Promise<{
		accessToken: string;
	}>;
	/**
	 * A spec-compliant fetch implementation. If not provided,
	 * the global fetch will be used. authEndpoint will
	 * be used to fetch the token.
	 */
	fetch?: typeof fetch;
}

export type SyncTransportMode = 'realtime' | 'pull';

export interface SyncConfig<Profile = any, Presence = any>
	extends ServerSyncEndpointProviderConfig {
	/**
	 * When a client first connects, it will use this presence value.
	 */
	initialPresence: Presence;
	/**
	 * Before connecting to the server, the local client will have
	 * this value for their profile data. You can either cache and store
	 * profile data from a previous connection or provide defaults like
	 * empty strings.
	 */
	defaultProfile: Profile;

	/**
	 * Provide `false` to disable transport selection. Transport selection
	 * automatically switches between HTTP and WebSocket based sync depending
	 * on the number of peers connected. If a user is alone, they will use
	 * HTTP push/pull to sync changes. If another user joins, both users will
	 * be upgraded to websockets.
	 *
	 * Provide `peers-only` to only automatically use websockets if other
	 * users connect, but not if another device for the current user connects.
	 * By default, automatic transport selection will upgrade to websockets if
	 * another device from the current user connects, but if realtime sync is
	 * not necessary for such cases, you can save bandwidth by disabling this.
	 *
	 * Turning off this feature allows you more control over the transport
	 * which can be useful for low-power devices or to save server traffic.
	 * To modify transport modes manually, utilize `client.sync.setMode`.
	 * The built-in behavior is essentially switching modes based on
	 * the number of peers detected by client.sync.presence.
	 */
	automaticTransportSelection?: boolean | 'peers-only';
	initialTransport?: SyncTransportMode;
	autoStart?: boolean;
	/**
	 * Optionally specify an interval, in milliseconds, to poll the server
	 * when in pull mode.
	 */
	pullInterval?: number;
	/**
	 * Presence updates are batched to reduce number of requests / messages
	 * sent to the server. You can specify the batching time slice, in milliseconds,
	 */
	presenceUpdateBatchTimeout?: number;
	/**
	 * Experimental: sync messages over a broadcast channel between tabs.
	 * Fixes tabs not reactively updating to changes when other tabs are open,
	 * but is not yet thoroughly vetted.
	 */
	useBroadcastChannel?: boolean;
	/**
	 * Listen for outgoing messages from the client to the server.
	 * Not sure why you want to do this, but be careful.
	 */
	onOutgoingMessage?: (message: ClientMessage) => void;

	EXPERIMENTAL_backgroundSync?: boolean;
}

export interface PersistenceConfig {
	disableRebasing?: boolean;
	rebaseTimeout?: number;
}

export interface QueryConfig {
	/**
	 * Milliseconds to hold a query in memory after it is unsubscribed before
	 * disposing of it. Once a query is disposed, it must be loaded fresh again
	 * on next use. Queries are cached based on their `key`, which you can
	 * manually override. By default keys are determined by the parameters
	 * passed to the query.
	 *
	 * Defaults to 5 seconds.
	 */
	evictionTime?: number;
}

export type ContextWithoutPersistence = Omit<
	Context,
	'meta' | 'documents' | 'files'
>;
