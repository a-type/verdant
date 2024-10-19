import { roughSizeOfObject } from '@verdant-web/common';

export const globalIDB =
	typeof window !== 'undefined' ? window.indexedDB : (undefined as any);

export function isAbortError(err: unknown) {
	return err instanceof Error && err.name === 'AbortError';
}

export function storeRequestPromise<T>(request: IDBRequest<T>) {
	return new Promise<T>((resolve, reject) => {
		request.onsuccess = () => {
			resolve(request.result);
		};
		request.onerror = () => {
			if (request.error && isAbortError(request.error)) {
				// TODO: is this the right thing to do?
				resolve(request.result);
			} else {
				reject(request.error);
			}
		};
	});
}

export function cursorIterator<T>(
	request: IDBRequest<IDBCursorWithValue | null>,
	callback: (value: T | null) => boolean,
) {
	return new Promise<void>((resolve, reject) => {
		request.onsuccess = () => {
			const cursor = request.result;
			if (cursor) {
				if (callback(cursor.value)) {
					cursor.continue();
				} else {
					resolve();
				}
			} else {
				resolve();
			}
		};
		request.onerror = () => {
			if (request.error && isAbortError(request.error)) {
				resolve();
			} else {
				reject(request.error);
			}
		};
	});
}

export function getSizeOfObjectStore(
	database: IDBDatabase,
	storeName: string,
): Promise<{ count: number; size: number }> {
	return new Promise((resolve, reject) => {
		const tx = database.transaction([storeName], 'readonly');
		const store = tx.objectStore(storeName);
		const cursorReq = store.openCursor();
		let count = 0;
		let size = 0;
		cursorReq.onsuccess = function (e) {
			const cursor = cursorReq.result;
			if (cursor) {
				count++;
				size = size + roughSizeOfObject(cursor.value);
				cursor.continue();
			}
		};
		cursorReq.onerror = function (e) {
			if (cursorReq.error && isAbortError(cursorReq.error)) {
				resolve({
					count: count,
					size: size,
				});
			} else {
				reject(cursorReq.error);
			}
		};
		tx.oncomplete = function (e) {
			resolve({
				count: count,
				size: size,
			});
		};
		tx.onabort = function (e) {
			reject(e);
		};
		tx.onerror = function (e) {
			reject(e);
		};
	});
}

export async function getSizesOfAllObjectStores(
	database: IDBDatabase,
): Promise<{ [storeName: string]: { count: number; size: number } }> {
	const storeNames = Array.from(database.objectStoreNames);
	const promises = storeNames.map(async (storeName) => {
		const result = await getSizeOfObjectStore(database, storeName);
		return { [storeName]: result };
	});
	const results = await Promise.all(promises);
	return results.reduce((acc, result_1) => {
		return { ...acc, ...result_1 };
	}, {});
}

export function getAllFromObjectStores(db: IDBDatabase, stores: string[]) {
	const transaction = db.transaction(stores, 'readonly');
	const promises = stores.map((store) => {
		const objectStore = transaction.objectStore(store);
		return storeRequestPromise(objectStore.getAll());
	});
	return Promise.all(promises);
}

export async function closeDatabase(db: IDBDatabase) {
	db.close();
	// wait for microtask queue to clear
	await new Promise<void>((resolve, reject) => {
		resolve();
	});
}

export async function deleteAllDatabases(
	namespace: string,
	indexedDB: IDBFactory = globalIDB,
) {
	const req1 = indexedDB.deleteDatabase([namespace, 'meta'].join('_'));
	const req2 = indexedDB.deleteDatabase([namespace, 'collections'].join('_'));
	await Promise.all([
		new Promise((resolve, reject) => {
			req1.onsuccess = resolve;
			req1.onerror = reject;
		}),
		new Promise((resolve, reject) => {
			req2.onsuccess = resolve;
			req2.onerror = reject;
		}),
	]);
	window.location.reload();
}

export function deleteDatabase(name: string, indexedDB = window.indexedDB) {
	return storeRequestPromise(indexedDB.deleteDatabase(name));
}

export async function getAllDatabaseNamesAndVersions(
	indexedDB: IDBFactory = window.indexedDB,
) {
	return indexedDB.databases();
}

export function createAbortableTransaction(
	db: IDBDatabase,
	storeNames: string[],
	mode: 'readonly' | 'readwrite',
	abortSignal?: AbortSignal,
	log?: (...args: any[]) => void,
) {
	const tx = db.transaction(storeNames, mode);
	if (abortSignal) {
		const abort = () => {
			log?.('debug', 'aborting transaction');
			try {
				tx.abort();
			} catch (e) {
				log?.('debug', 'aborting transaction failed', e);
			}
		};
		abortSignal.addEventListener('abort', abort);
		tx.addEventListener('error', () => {
			abortSignal.removeEventListener('abort', abort);
		});
		tx.addEventListener('complete', () => {
			abortSignal.removeEventListener('abort', abort);
		});
	}
	return tx;
}

/**
 * Empties all data in a database without changing
 * its structure.
 */
export function emptyDatabase(db: IDBDatabase) {
	const storeNames = Array.from(db.objectStoreNames);
	const tx = db.transaction(storeNames, 'readwrite');
	for (const storeName of storeNames) {
		tx.objectStore(storeName).clear();
	}
	return new Promise<void>((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function copyDatabase(from: IDBDatabase, to: IDBDatabase) {
	await emptyDatabase(to);
	const records = await getAllFromObjectStores(
		from,
		Array.from(from.objectStoreNames),
	);
	const writeTx = to.transaction(Array.from(to.objectStoreNames), 'readwrite');
	for (let i = 0; i < records.length; i++) {
		const store = writeTx.objectStore(from.objectStoreNames[i]);
		for (const record of records[i]) {
			store.add(record);
		}
	}
	return new Promise<void>((resolve, reject) => {
		writeTx.oncomplete = () => resolve();
		writeTx.onerror = () => reject(writeTx.error);
	});
}

export function openDatabase(
	name: string,
	expectedVersion: number,
	indexedDB: IDBFactory = window.indexedDB,
) {
	return new Promise<IDBDatabase>((resolve, reject) => {
		const req = indexedDB.open(name, expectedVersion);
		req.onsuccess = () => {
			resolve(req.result);
		};
		req.onerror = () => {
			reject(req.error);
		};
		req.onblocked = () => {
			reject(new Error('Database blocked'));
		};
		req.onupgradeneeded = (event) => {
			const db = req.result;
			if (db.version !== expectedVersion) {
				db.close();
				reject(
					new Error(
						`Migration error: database version changed unexpectedly when reading current data. Expected ${expectedVersion}, got ${db.version}`,
					),
				);
			}
		};
	});
}

export function getMetadataDbName(namespace: string) {
	return [namespace, 'meta'].join('_');
}

export function getDocumentDbName(namespace: string) {
	return [namespace, 'collections'].join('_');
}

export function getNamespaceFromDatabaseInfo(info: IDBDatabaseInfo) {
	return info.name?.split('_')[0];
}
