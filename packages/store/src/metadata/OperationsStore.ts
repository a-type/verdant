import {
	createCompoundIndexValue,
	createLowerBoundIndexValue,
	createUpperBoundIndexValue,
	getOidRoot,
	ObjectIdentifier,
	Operation,
	assert,
} from '@verdant-web/common';
import { IDBService } from '../IDBService.js';

export type ClientOperation = Operation & {
	isLocal: boolean;
};

export type StoredClientOperation = ClientOperation & {
	oid_timestamp: string;
	l_t: string;
	d_t: string;
};

export class OperationsStore extends IDBService {
	/**
	 * Iterates over every patch for the root and every sub-object
	 * of a given document. Optionally limit by timestamp.
	 */
	iterateOverAllOperationsForDocument = async (
		oid: ObjectIdentifier,
		iterator: (patch: StoredClientOperation, store: IDBObjectStore) => void,
		{
			to,
			from,
			after,
			mode = 'readonly',
			transaction: providedTx,
		}: {
			to?: string;
			from?: string;
			after?: string;
			mode?: 'readwrite' | 'readonly';
			transaction?: IDBTransaction;
		} = {},
	): Promise<void> => {
		const transaction = providedTx || this.db.transaction('operations', mode);
		const store = transaction.objectStore('operations');
		const index = store.index('d_t');

		const startTimestamp = from || after;
		const start = startTimestamp
			? createCompoundIndexValue(oid, startTimestamp)
			: createLowerBoundIndexValue(oid);
		const end = to
			? createCompoundIndexValue(oid, to)
			: createUpperBoundIndexValue(oid);

		const range = IDBKeyRange.bound(start, end, !!after, false);

		const request = index.openCursor(range, 'next');
		return new Promise<void>((resolve, reject) => {
			let previousTimestamp: string | undefined;
			request.onsuccess = (event) => {
				const cursor = request.result;
				if (cursor) {
					const value = cursor.value as StoredClientOperation;
					assert(value.oid.startsWith(oid));
					assert(
						previousTimestamp === undefined ||
							previousTimestamp <= value.timestamp,
						`expected ${previousTimestamp} <= ${value.timestamp}`,
					);

					iterator(value, store);
					previousTimestamp = value.timestamp;
					cursor.continue();
				} else {
					resolve();
				}
			};
			request.onerror = (event) => {
				reject(event);
			};
		});
	};

	iterateOverAllOperationsForEntity = async (
		oid: ObjectIdentifier,
		iterator: (patch: StoredClientOperation, store: IDBObjectStore) => void,
		{
			after,
			to,
			mode,
			transaction: providedTx,
		}: {
			after?: string;
			to?: string;
			mode?: 'readwrite' | 'readonly';
			transaction?: IDBTransaction;
		},
	): Promise<void> => {
		const transaction = providedTx || this.db.transaction('operations', mode);
		const store = transaction.objectStore('operations');

		const start = after
			? createCompoundIndexValue(oid, after)
			: createLowerBoundIndexValue(oid);
		const end = to
			? createCompoundIndexValue(oid, to)
			: createUpperBoundIndexValue(oid);

		const range = IDBKeyRange.bound(start, end, !!after, false);

		const request = store.openCursor(range, 'next');
		return new Promise<void>((resolve, reject) => {
			let previousTimestamp: string | undefined;
			request.onsuccess = (event) => {
				const cursor = request.result;
				if (cursor) {
					const value = cursor.value as StoredClientOperation;
					assert(value.oid.startsWith(oid));
					assert(
						previousTimestamp === undefined ||
							previousTimestamp <= value.timestamp,
						`expected ${previousTimestamp} <= ${value.timestamp}`,
					);

					iterator(value, store);
					previousTimestamp = value.timestamp;
					cursor.continue();
				} else {
					resolve();
				}
			};
			request.onerror = (event) => {
				reject(event);
			};
		});
	};

	iterateOverAllOperationsForCollection = async (
		collection: string,
		iterator: (patch: StoredClientOperation, store: IDBObjectStore) => void,
		{
			after,
			to,
			mode,
			transaction: providedTx,
		}: {
			after?: string;
			to?: string;
			mode?: 'readwrite' | 'readonly';
			transaction?: IDBTransaction;
		},
	): Promise<void> => {
		const transaction = providedTx || this.db.transaction('operations', mode);

		return this.iterate(
			'operations',
			(store) => {
				return store.openCursor(
					IDBKeyRange.bound(collection, collection + '\uffff', false, false),
					'next',
				);
			},
			iterator,
			mode,
			transaction,
		);
	};

	iterateOverAllLocalOperations = async (
		iterator: (patch: ClientOperation, store: IDBObjectStore) => void,
		{
			before,
			after,
			mode = 'readonly',
			transaction: providedTx,
		}: {
			before?: string | null;
			after?: string | null;
			mode?: 'readwrite' | 'readonly';
			transaction?: IDBTransaction;
		},
	): Promise<void> => {
		const transaction = providedTx || this.db.transaction('operations', mode);
		const store = transaction.objectStore('operations');
		const index = store.index('l_t');

		const start = after
			? createCompoundIndexValue(true, after)
			: createLowerBoundIndexValue(true);
		const end = before
			? createCompoundIndexValue(true, before)
			: createUpperBoundIndexValue(true);

		const range = IDBKeyRange.bound(start, end, !!after, true);

		const request = index.openCursor(range, 'next');
		return new Promise<void>((resolve, reject) => {
			let previousTimestamp: string | undefined;
			request.onsuccess = (event) => {
				const cursor = request.result;
				if (cursor) {
					const value = cursor.value as StoredClientOperation;
					assert(
						previousTimestamp === undefined ||
							previousTimestamp <= value.timestamp,
						`expected ${previousTimestamp} <= ${value.timestamp}`,
					);

					iterator(value, store);
					previousTimestamp = value.timestamp;
					cursor.continue();
				} else {
					resolve();
				}
			};
			request.onerror = (event) => {
				reject(event);
			};
		});
	};

	iterateOverAllOperations = async (
		iterator: (patch: ClientOperation, store: IDBObjectStore) => void,
		{
			before,
			transaction,
			mode,
			from,
		}: {
			/** Ending timestamp, exclusive */
			before?: string | null;
			/** Starting timestamp, inclusive */
			from?: string | null;
			transaction?: IDBTransaction;
			mode?: 'readwrite' | 'readonly';
		},
	): Promise<void> => {
		await this.iterate(
			'operations',
			(store) => {
				const start = from ? createLowerBoundIndexValue(from) : undefined;
				const end = before ? createUpperBoundIndexValue(before) : undefined;

				const range =
					start && end
						? IDBKeyRange.bound(start, end, false, true)
						: start
						? IDBKeyRange.lowerBound(start, false)
						: end
						? IDBKeyRange.upperBound(end, true)
						: undefined;
				const index = store.index('timestamp');
				return index.openCursor(range, 'next');
			},
			iterator,
			mode,
			transaction,
		);
	};

	/**
	 * Adds a set of patches to the database.
	 * @returns a list of affected root document OIDs.
	 */
	addOperations = async (
		patches: ClientOperation[],
		{ transaction }: { transaction?: IDBTransaction } = {},
	): Promise<ObjectIdentifier[]> => {
		return this.insert(patches.map(this.addCompoundIndexes), { transaction });
	};

	private addCompoundIndexes = (
		patch: ClientOperation,
	): StoredClientOperation => {
		return {
			...patch,
			oid_timestamp: createCompoundIndexValue(
				patch.oid,
				patch.timestamp,
			) as string,
			l_t: createCompoundIndexValue(patch.isLocal, patch.timestamp) as string,
			d_t: createCompoundIndexValue(
				getOidRoot(patch.oid),
				patch.timestamp,
			) as string,
		};
	};

	private insert = async (
		operations: StoredClientOperation[],
		{ transaction }: { transaction?: IDBTransaction },
	): Promise<ObjectIdentifier[]> => {
		const affected = new Set<ObjectIdentifier>();
		await this.runAll(
			'operations',
			(store) =>
				operations.map((op) => {
					affected.add(getOidRoot(op.oid));
					return store.put(op);
				}),
			'readwrite',
			transaction,
		);
		return Array.from(affected);
	};

	reset = () => {
		return this.clear('operations');
	};
}
