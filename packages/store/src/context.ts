import { EventSubscriber, StorageSchema } from '@verdant-web/common';
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
	log: (...args: any[]) => void;
	entityEvents: EventSubscriber<{
		collectionsChanged: (names: string[]) => void;
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
	}>;
	weakRef<T extends WeakKey>(value: T): WeakRef<T>;
}
