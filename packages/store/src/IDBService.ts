import { Context } from './context.js';
import {
	createAbortableTransaction,
	isAbortError,
	storeRequestPromise,
} from './idb.js';
import { Disposable } from './utils/Disposable.js';

export class IDBService extends Disposable {
	protected log?: Context['log'];
	private globalAbortController = new AbortController();

	constructor(
		protected db: IDBDatabase,
		{ log }: { log?: Context['log'] } = {},
	) {
		super();
		this.log = log;
		this.addDispose(() => {
			this.globalAbortController.abort();
		});
	}

	createTransaction = (
		storeNames: string[],
		opts?: {
			mode?: 'readonly' | 'readwrite';
			abort?: AbortSignal;
		},
	) => {
		const tx = createAbortableTransaction(
			this.db,
			storeNames,
			opts?.mode || 'readonly',
			opts?.abort,
			this.log,
		);
		this.globalAbortController.signal.addEventListener('abort', tx.abort);
		tx.addEventListener('complete', () => {
			this.globalAbortController.signal.removeEventListener('abort', tx.abort);
		});
		tx.addEventListener('error', () => {
			this.globalAbortController.signal.removeEventListener('abort', tx.abort);
		});
		return tx;
	};

	run = async <T>(
		storeName: string,
		getRequest: (store: IDBObjectStore) => IDBRequest<T>,
		opts?: {
			mode?: 'readonly' | 'readwrite';
			transaction?: IDBTransaction;
			abort?: AbortSignal;
		},
	): Promise<T> => {
		if (this.disposed || opts?.transaction?.error)
			return Promise.resolve(undefined as any);
		const tx = opts?.transaction || this.createTransaction([storeName], opts);
		const store = tx.objectStore(storeName);
		const request = getRequest(store);
		return storeRequestPromise<T>(request);
	};

	runAll = async <T>(
		storeName: string,
		getRequests: (store: IDBObjectStore) => IDBRequest<T>[],
		opts?: {
			mode: 'readonly' | 'readwrite';
			transaction?: IDBTransaction;
			abort?: AbortSignal;
		},
	): Promise<T[]> => {
		if (this.disposed || opts?.transaction?.error) return Promise.resolve([]);
		const tx = opts?.transaction || this.createTransaction([storeName], opts);
		const store = tx.objectStore(storeName);
		const requests = getRequests(store);
		return Promise.all(requests.map(storeRequestPromise));
	};

	iterate = async <T>(
		storeName: string,
		getRequest: (store: IDBObjectStore) => IDBRequest | IDBRequest[],
		iterator: (value: T, store: IDBObjectStore) => void,
		opts?: {
			mode?: 'readonly' | 'readwrite';
			transaction?: IDBTransaction;
			abort?: AbortSignal;
		},
	): Promise<void> => {
		const tx = opts?.transaction || this.createTransaction([storeName], opts);
		const store = tx.objectStore(storeName);
		const request = getRequest(store);
		if (Array.isArray(request)) {
			return Promise.all(
				request.map((req) => {
					return new Promise<void>((resolve, reject) => {
						req.onsuccess = () => {
							const cursor = req.result;
							if (cursor) {
								iterator(cursor.value, store);
								cursor.continue();
							} else {
								resolve();
							}
						};
						req.onerror = () => {
							if (req.error && isAbortError(req.error)) {
								resolve();
							} else {
								reject(req.error);
							}
						};
					});
				}),
			).then(() => undefined);
		}
		return new Promise<void>((resolve, reject) => {
			request.onsuccess = () => {
				const cursor = request.result;
				if (cursor) {
					iterator(cursor.value, store);
					cursor.continue();
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
	};

	clear = (storeName: string) => {
		return this.run<undefined>(storeName, (store) => store.clear(), {
			mode: 'readwrite',
		});
	};
}
