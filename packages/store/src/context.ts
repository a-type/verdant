import {
	EventSubscriber,
	Migration,
	ObjectIdentifier,
	StorageSchema,
	TimestampProvider,
} from '@verdant-web/common';
import { UndoHistory } from './UndoHistory.js';

/**
 * Common components utilized across various client
 * services.
 */
export interface Context {
	namespace: string;
	metaDb: IDBDatabase;
	documentDb: IDBDatabase;
	undoHistory: UndoHistory;
	schema: StorageSchema;
	oldSchemas?: StorageSchema[];
	log: (...args: any[]) => void;
	entityEvents: EventSubscriber<{
		collectionsChanged: (names: string[]) => void;
		documentChanged: (oid: ObjectIdentifier) => void;
	}>;
	internalEvents: EventSubscriber<{
		documentDbChanged: (db: IDBDatabase) => void;
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
	}>;
	weakRef<T extends object>(value: T): WeakRef<T>;
	migrations: Migration<any>[];
	/**
	 * Get the current logical timestamp
	 */
	getNow(): string;
}
