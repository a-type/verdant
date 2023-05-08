import { roughSizeOfObject } from '@verdant-web/common';

export function storeRequestPromise<T>(request: IDBRequest<T>) {
	return new Promise<T>((resolve, reject) => {
		request.onsuccess = () => {
			resolve(request.result);
		};
		request.onerror = () => {
			reject(request.error);
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
			reject(request.error);
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
			reject(e);
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
