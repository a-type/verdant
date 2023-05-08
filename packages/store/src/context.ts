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
}
