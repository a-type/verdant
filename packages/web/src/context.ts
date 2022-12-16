import { StorageSchema } from '@lo-fi/common';
import { Metadata } from './metadata/Metadata.js';
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
}
