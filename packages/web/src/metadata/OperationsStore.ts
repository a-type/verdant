import {
	createCompoundIndexValue,
	createLowerBoundIndexValue,
	createUpperBoundIndexValue,
	getOidRoot,
	ObjectIdentifier,
	Operation,
	assert,
} from '@lo-fi/common';
import { IDBService } from '../IDBService.js';

export type ClientOperation = Operation & {
	isLocal: boolean;
};

export type StoredClientOperation = ClientOperation & {
	oid_timestamp: string;
	isLocal_timestamp: string;
	documentOid_timestamp: string;
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
		}: {
			to?: string;
			from?: string;
			after?: string;
			mode?: 'readwrite' | 'readonly';
		} = {},
	): Promise<void> => {
		const transaction = this.db.transaction('operations', mode);
		const store = transaction.objectStore('operations');
		const index = store.index('documentOid_timestamp');

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
			to,
			mode,
		}: {
			to?: string;
			mode?: 'readwrite' | 'readonly';
		},
	): Promise<void> => {
		const transaction = this.db.transaction('operations', mode);
		const store = transaction.objectStore('operations');

		const start = createLowerBoundIndexValue(oid);
		const end = to
			? createCompoundIndexValue(oid, to)
			: createUpperBoundIndexValue(oid);

		const range = IDBKeyRange.bound(start, end, false, false);

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

	iterateOverAllLocalOperations = async (
		iterator: (patch: ClientOperation, store: IDBObjectStore) => void,
		{
			before,
			after,
		}: {
			before?: string | null;
			after?: string | null;
		},
	): Promise<void> => {
		const transaction = this.db.transaction('operations', 'readonly');
		const store = transaction.objectStore('operations');
		const index = store.index('isLocal_timestamp');

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

	/**
	 * Adds a set of patches to the database.
	 * @returns a list of affected root document OIDs.
	 */
	addOperations = async (
		patches: ClientOperation[],
	): Promise<ObjectIdentifier[]> => {
		return this.insert(patches.map(this.addCompoundIndexes));
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
			isLocal_timestamp: createCompoundIndexValue(
				patch.isLocal,
				patch.timestamp,
			) as string,
			documentOid_timestamp: createCompoundIndexValue(
				getOidRoot(patch.oid),
				patch.timestamp,
			) as string,
		};
	};

	private insert = async (
		operations: StoredClientOperation[],
	): Promise<ObjectIdentifier[]> => {
		const transaction = this.db.transaction('operations', 'readwrite');
		const store = transaction.objectStore('operations');
		const affected = new Set<ObjectIdentifier>();
		for (const patch of operations) {
			store.put(patch);
			affected.add(getOidRoot(patch.oid));
		}
		await new Promise<void>((resolve, reject) => {
			transaction.oncomplete = () => {
				resolve();
			};
			transaction.onerror = () => {
				reject();
			};
		});
		return Array.from(affected);
	};

	reset = () => {
		return this.clear('operations');
	};
}
