import {
	ClientMessage,
	EventSubscriber,
	FileData,
	FileRef,
	Migration,
	ObjectIdentifier,
	Operation,
	PatchCreator,
	StorageSchema,
} from '@verdant-web/common';
import { UndoHistory } from '../UndoHistory.js';
import { Time } from './Time.js';
import type { PersistenceDocuments } from '../persistence/PersistenceQueries.js';
import type { PersistenceMetadata } from '../persistence/PersistenceMetadata.js';
import { PersistenceFiles } from '../persistence/PersistenceFiles.js';
import {
	PersistedFileData,
	PersistenceImplementation,
} from '../persistence/interfaces.js';

/**
 * Common components utilized across various client
 * services.
 */
export interface Context {
	namespace: string;
	/**
	 * when in WIP mode, namespace might be set to a temporary value. This will always point to the
	 * namespace the user passed in.
	 */
	originalNamespace: string;
	time: Time;

	meta: PersistenceMetadata;
	documents: PersistenceDocuments;
	files: PersistenceFiles;

	undoHistory: UndoHistory;
	schema: StorageSchema;
	oldSchemas: StorageSchema[];
	log: (
		level: 'debug' | 'info' | 'warn' | 'error' | 'critical',
		...args: any[]
	) => void;
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
		[ev: `fileUploaded:${string}`]: () => void;
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
	}>;
	weakRef<T extends object>(value: T): WeakRef<T>;
	migrations: Migration<any>[];
	closing: boolean;
	patchCreator: PatchCreator;

	config: {
		files?: FileConfig;
		sync?: SyncConfig;
		persistence?: PersistenceConfig;
	};

	persistence: PersistenceImplementation;
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

export type InitialContext = Omit<Context, 'documents' | 'meta' | 'files'>;
