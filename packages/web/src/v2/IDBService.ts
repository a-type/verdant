import { storeRequestPromise } from './idb.js';

export class IDBService {
	constructor(protected readonly db: IDBDatabase) {}

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

	clear = (storeName: string) => {
		return this.run(storeName, (store) => store.clear(), 'readwrite');
	};
}
