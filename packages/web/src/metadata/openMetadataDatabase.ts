export function openMetadataDatabase(
	namespace: string,
	{
		indexedDB = window.indexedDB,
		log,
	}: {
		indexedDB?: IDBFactory;
		log?: (...args: any[]) => void;
	},
) {
	return new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open([namespace, 'meta'].join('_'), 3);
		request.onupgradeneeded = async (event) => {
			const db = request.result;
			if (event.oldVersion === 2) {
				/**
				 * 2 -> 3 changes:
				 *
				 * Add timestamp index to operations
				 */
				const tx = request.transaction!;
				const operations = tx.objectStore('operations');
				operations.createIndex('timestamp', 'timestamp');
			} else if (event.oldVersion === 1) {
				/**
				 * 1 -> 2 changes:
				 *
				 * Consolidate compound index names:
				 *
				 * Operations:
				 * - isLocal_timestamp -> l_t
				 * - documentOid_timestamp -> d_t
				 */
				const tx = request.transaction!;
				const operations = tx.objectStore('operations');
				await new Promise<void>((resolve, reject) => {
					const cursorReq = operations.openCursor();
					cursorReq.onsuccess = () => {
						// rename the consolidated fields
						const cursor = cursorReq.result;
						if (cursor) {
							const { isLocal_timestamp, documentOid_timestamp, ...value } =
								cursor.value;
							cursor.update({
								...value,
								l_t: isLocal_timestamp,
								d_t: documentOid_timestamp,
							});
							cursor.continue();
						} else {
							resolve();
						}
					};
					cursorReq.onerror = (event) => {
						reject(request.error);
					};
				});
				// remove the old indexes
				operations.deleteIndex('isLocal_timestamp');
				operations.deleteIndex('documentOid_timestamp');
				// create the new indexes
				operations.createIndex('l_t', 'l_t', { unique: false });
				operations.createIndex('d_t', 'd_t', { unique: false });
			} else {
				/**
				 * Migrating from 0: just create the desired object stores
				 */
				db.createObjectStore('info', { keyPath: 'type' });

				const baselinesStore = db.createObjectStore('baselines', {
					keyPath: 'oid',
				});
				baselinesStore.createIndex('timestamp', 'timestamp');

				const operationsStore = db.createObjectStore('operations', {
					keyPath: 'oid_timestamp',
				});
				operationsStore.createIndex('l_t', 'l_t');
				operationsStore.createIndex('d_t', 'd_t');
				operationsStore.createIndex('timestamp', 'timestamp');
			}
		};
		request.onerror = () => {
			console.error('Error opening database', request.error);
			reject(request.error);
		};
		request.onsuccess = () => {
			resolve(request.result);
		};
	});
}
