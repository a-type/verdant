import { Context } from '../../context/context.js';
import { Disposable } from '../../utils/Disposable.js';
import {
	createAbortableTransaction,
	isAbortError,
	storeRequestPromise,
} from './util.js';

export class IdbService extends Disposable {
	protected log?: Context['log'];
	private globalAbortController;

	constructor(
		protected db: IDBDatabase,
		{ log }: { log?: Context['log'] } = {},
	) {
		super();
		this.log = log;
		const abortController = new AbortController();
		const abort = abortController.abort.bind(abortController);
		this.globalAbortController = abortController;
		// this.addDispose(abort);
		this.db.addEventListener('versionchange', this.onVersionChange);
		this.addDispose(() => {
			this.db.removeEventListener('versionchange', this.onVersionChange);
		});
	}

	createTransaction = (
		storeNames: string[],
		opts?: {
			mode?: 'readonly' | 'readwrite';
			abort?: AbortSignal;
		},
	) => {
		try {
			if (this.globalAbortController.signal.aborted) {
				throw new Error('Global abort signal is already aborted');
			}
			const tx = createAbortableTransaction(
				this.db,
				storeNames,
				opts?.mode || 'readonly',
				opts?.abort,
				this.log,
			);
			this.globalAbortController.signal.addEventListener('abort', tx.abort);
			tx.addEventListener('complete', () => {
				this.globalAbortController.signal.removeEventListener(
					'abort',
					tx.abort,
				);
			});
			tx.addEventListener('error', () => {
				this.globalAbortController.signal.removeEventListener(
					'abort',
					tx.abort,
				);
			});
			return tx;
		} catch (err) {
			this.log?.(
				'error',
				'Failed to create abortable transaction for store names',
				storeNames,
				err,
			);
			throw err;
		}
	};

	run = async <T = any>(
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
			mode?: 'readonly' | 'readwrite';
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
		getRequest: (
			store: IDBObjectStore,
		) =>
			| IDBRequest<IDBCursorWithValue | null>
			| IDBRequest<IDBCursorWithValue | null>[],
		iterator: (
			value: T,
			store: IDBObjectStore,
			cursor: IDBCursorWithValue,
		) => boolean | void,
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
								const stop = iterator(cursor.value, store, cursor);
								if (stop) {
									resolve();
								} else {
									cursor.continue();
								}
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
				const cursor = request.result as IDBCursorWithValue | null;
				if (cursor) {
					const stop = iterator(cursor.value, store, cursor);
					if (stop) {
						resolve();
					} else {
						cursor.continue();
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
	};

	clear = (storeName: string, transaction?: IDBTransaction) => {
		return this.run<undefined>(storeName, (store) => store.clear(), {
			mode: 'readwrite',
			transaction,
		});
	};

	private onVersionChange = (ev: IDBVersionChangeEvent) => {
		this.log?.(
			'warn',
			`Another tab has requested a version change for ${this.db.name}`,
		);
		this.db.close();
		if (typeof window !== 'undefined') {
			try {
				window.location.reload();
			} catch (err) {
				this.log?.('error', 'Failed to reload the page', err);
			}
		}
	};
}
