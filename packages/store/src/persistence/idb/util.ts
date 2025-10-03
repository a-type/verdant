import { roughSizeOfObject } from '@verdant-web/common';
import { Context } from '../../internal.js';

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
	await new Promise<void>((resolve) => {
		resolve();
	});
	await new Promise<void>((resolve) => {
		resolve();
	});
}

export async function deleteAllDatabases(
	namespace: string,
	environment: Context['environment'],
) {
	const req1 = environment.indexedDB.deleteDatabase(
		[namespace, 'meta'].join('_'),
	);
	const req2 = environment.indexedDB.deleteDatabase(
		[namespace, 'collections'].join('_'),
	);
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
	// reload the page to reset any existing connections
	environment.location.reload();
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
	try {
		const tx = db.transaction(storeNames, mode);
		if (abortSignal) {
			const abort = () => {
				log?.('debug', 'aborting transaction');
				try {
					tx.abort();
					(tx as any).__aborted = true;
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
	} catch (err) {
		if (err instanceof Error && err.name === 'InvalidStateError') {
			// database is probably closing. it's ok, what can you do?
			log?.('warn', 'Failed to create transaction, database is closing');
			// mock a Transaction so code can continue,
			// but doesn't do anything.
			return {
				abort: () => {},
				addEventListener: () => {},
				objectStore: () => {
					return {
						add: () => {},
						put: () => {},
						get: () => {},
						getAll: () => {},
						delete: () => {},
						clear: () => {},
						openCursor: () => {
							const req = {
								onsuccess: () => {},
								onerror: (_: any) => {},
								result: null,
							};
							setTimeout(() => {
								req.onerror({} as any);
							}, 0);
							return req;
						},
						index: () => {
							throw new Error('Transaction is not active');
						},
					};
				},
				oncomplete: null,
				onerror: null,
				onabort: null,
				error: new Error('Transaction is not active') as any,
				commit: () => {},
				db,
				dispatchEvent: () => false,
				removeEventListener: () => {},
				durability: 'default',
				mode: 'readonly',
				objectStoreNames: storeNames as any,
				__aborted: true,
			} as unknown as IDBTransaction;
		} else {
			throw err;
		}
	}
}

export function isTransactionAborted(tx: IDBTransaction) {
	return (tx as any).__aborted;
}

/**
 * Deletes any existing database with name `toName` and
 * copies the index structure and all data
 * from `from` to a new database.
 *
 * Does NOT run Verdant migrations. Use to copy existing
 * data as-is.
 */
export async function overwriteDatabase(
	from: IDBDatabase,
	toName: string,
	ctx: Pick<Context, 'log'>,
	indexedDB = window.indexedDB,
) {
	const databases = await getAllDatabaseNamesAndVersions(indexedDB);
	if (databases.some((d) => d.name === toName)) {
		await deleteDatabase(toName, indexedDB);
		ctx.log('debug', 'Deleted existing database', toName);
	}

	const to = await new Promise<IDBDatabase>((resolve, reject) => {
		ctx.log('debug', 'Opening reset database', toName, 'at', from.version);
		const openRequest = indexedDB.open(toName, from.version);
		openRequest.onupgradeneeded = () => {
			ctx.log(
				'debug',
				'Upgrading database',
				toName,
				'to version',
				from.version,
			);
			// copy all indexes from original
			const original = from;
			const upgradeTx = openRequest.transaction;
			if (!upgradeTx) {
				throw new Error('No transaction');
			}
			for (const storeName of Array.from(original.objectStoreNames)) {
				const originalObjectStore = original
					.transaction(storeName)
					.objectStore(storeName);
				// create object store
				upgradeTx.db.createObjectStore(storeName, {
					keyPath: originalObjectStore.keyPath,
					autoIncrement: originalObjectStore.autoIncrement,
				});
				const store = upgradeTx.objectStore(storeName);
				const originalStore = original
					.transaction(storeName)
					.objectStore(storeName);
				for (const index of Array.from(originalStore.indexNames)) {
					const originalIndex = originalStore.index(index);
					ctx.log('debug', 'Copying index', index);
					store.createIndex(index, originalIndex.keyPath, {
						unique: originalIndex.unique,
						multiEntry: originalIndex.multiEntry,
					});
				}
			}
		};
		openRequest.onsuccess = () => {
			ctx.log('debug', 'Opened reset database', toName);
			resolve(openRequest.result);
		};
		openRequest.onerror = () =>
			reject(openRequest.error ?? new Error('Unknown database upgrade error'));
	});

	const records = await getAllFromObjectStores(
		from,
		Array.from(from.objectStoreNames),
	);
	await new Promise<void>((resolve, reject) => {
		const writeTx = to.transaction(
			Array.from(to.objectStoreNames),
			'readwrite',
		);
		for (let i = 0; i < records.length; i++) {
			const store = writeTx.objectStore(from.objectStoreNames[i]);
			for (const record of records[i]) {
				store.add(record);
			}
		}
		writeTx.oncomplete = () => resolve();
		writeTx.onerror = (ev) => {
			const err =
				writeTx.error ??
				(ev.target as any).transaction?.error ??
				new Error('Unknown error');
			ctx.log('critical', 'Error copying data', err);
			reject(err);
		};
	});

	await closeDatabase(to);
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
