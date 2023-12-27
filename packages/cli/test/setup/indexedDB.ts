import 'fake-indexeddb/auto';
import {
	IDBKeyRange,
	IDBCursor,
	IDBDatabase,
	IDBTransaction,
	IDBRequest,
	IDBFactory,
} from 'fake-indexeddb';
window.IDBKeyRange = IDBKeyRange;
window.IDBCursor = IDBCursor;
window.IDBDatabase = IDBDatabase;
window.IDBTransaction = IDBTransaction;
window.IDBRequest = IDBRequest;
window.IDBFactory = IDBFactory;
