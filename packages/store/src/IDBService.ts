import { storeRequestPromise } from './idb.js';

export class IDBService {
	constructor(protected readonly db: IDBDatabase) {}

	createTransaction = (
		storeNames: string[],
		mode: 'readonly' | 'readwrite',
	) => {
		return this.db.transaction(storeNames, mode);
	};

	run = async <T>(
		storeName: string,
		getRequest: (store: IDBObjectStore) => IDBRequest<T>,
		mode: 'readonly' | 'readwrite' = 'readonly',
		transaction?: IDBTransaction,
	): Promise<T> => {
		const tx = transaction || this.db.transaction(storeName, mode);
		const store = tx.objectStore(storeName);
		const request = getRequest(store);
		return storeRequestPromise<T>(request);
	};

	runAll = async <T>(
		storeName: string,
		getRequests: (store: IDBObjectStore) => IDBRequest<T>[],
		mode: 'readonly' | 'readwrite' = 'readonly',
		transaction?: IDBTransaction,
	): Promise<T[]> => {
		const tx = transaction || this.db.transaction(storeName, mode);
		const store = tx.objectStore(storeName);
		const requests = getRequests(store);
		return Promise.all(requests.map(storeRequestPromise));
	};

	iterate = async <T>(
		storeName: string,
		getRequest: (store: IDBObjectStore) => IDBRequest,
		iterator: (value: T, store: IDBObjectStore) => void,
		mode: 'readonly' | 'readwrite' = 'readonly',
		transaction?: IDBTransaction,
	): Promise<void> => {
		const tx = transaction || this.db.transaction(storeName, mode);
		const store = tx.objectStore(storeName);
		const request = getRequest(store);
		return new Promise<void>((resolve, reject) => {
			request.onsuccess = (event) => {
				const cursor = request.result;
				if (cursor) {
					iterator(cursor.value, store);
					cursor.continue();
				} else {
					resolve();
				}
			};
			request.onerror = reject;
		});
	};

	clear = (storeName: string) => {
		return this.run(storeName, (store) => store.clear(), 'readwrite');
	};
}
