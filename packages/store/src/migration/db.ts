import { closeDatabase, globalIDB, storeRequestPromise } from '../idb.js';
import { OpenDocumentDbContext } from './types.js';

export async function getDatabaseVersion(
	indexedDB: IDBFactory,
	namespace: string,
	version: number,
	log?: (...args: any[]) => void,
): Promise<number> {
	function openAndGetVersion(
		resolve: (res: [number, IDBDatabase]) => void,
		reject: (err: Error) => void,
	) {
		let currentVersion: number;
		let database: IDBDatabase;
		const request = indexedDB.open(
			[namespace, 'collections'].join('_'),
			version,
		);
		request.onupgradeneeded = async (event) => {
			currentVersion = event.oldVersion;
			const transaction = request.transaction!;
			database = request.result;
			transaction.abort();
		};
		request.onsuccess = (event) => {
			resolve([request.result.version, request.result]);
		};
		request.onblocked = (event) => {
			// retry if blocked
			log?.('Database blocked, waiting...');
			// setTimeout(() => {
			// 	openAndGetVersion(resolve, reject);
			// }, 200);
		};
		request.onerror = (event) => {
			// FIXME: this fails if the code is older than the local database
			resolve([currentVersion!, database!]);
		};
	}
	const [currentVersion, db] = await new Promise<[number, IDBDatabase]>(
		openAndGetVersion,
	);
	await closeDatabase(db);
	return currentVersion;
}

/**
 * Upgrades the database to the given version, using the given upgrader function.
 */
export async function upgradeDatabase(
	indexedDb: IDBFactory,
	namespace: string,
	version: number,
	upgrader: (
		transaction: IDBTransaction,
		db: IDBDatabase,
		event: IDBVersionChangeEvent,
	) => void,
	log?: (...args: any[]) => void,
): Promise<IDBDatabase> {
	function openAndUpgrade(
		resolve: (db: IDBDatabase) => void,
		reject: (err: Error) => void,
	) {
		const request = indexedDb.open(
			[namespace, 'collections'].join('_'),
			version,
		);
		let wasUpgraded = false;
		request.onupgradeneeded = (event) => {
			const transaction = request.transaction!;
			upgrader(transaction, request.result, event);
			wasUpgraded = true;
		};
		request.onsuccess = (event) => {
			if (wasUpgraded) {
				resolve(request.result);
			} else {
				reject(
					new Error(
						'Database was not upgraded when a version change was expected',
					),
				);
			}
		};
		request.onerror = (event) => {
			reject(request.error || new Error('Unknown error'));
		};
		request.onblocked = (event) => {
			log?.('Database upgrade blocked, waiting...');
			// setTimeout(() => {
			// 	openAndUpgrade(resolve, reject);
			// }, 200);
		};
	}
	return new Promise<IDBDatabase>(openAndUpgrade);
}

export async function acquireLock(
	namespace: string,
	procedure: () => Promise<void>,
) {
	if (typeof navigator !== 'undefined' && navigator.locks) {
		await navigator.locks.request(`verdant_migration_${namespace}`, procedure);
	} else {
		// TODO: is there a fallback?
		await procedure();
	}
}

export async function openDatabase({
	indexedDB = globalIDB,
	namespace,
	version,
	context,
}: {
	indexedDB?: IDBFactory;
	namespace: string;
	version: number;
	context: OpenDocumentDbContext;
}): Promise<IDBDatabase> {
	context.log('debug', 'Opening database', namespace, 'at version', version);
	const db = await new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(
			[namespace, 'collections'].join('_'),
			version,
		);
		request.onupgradeneeded = async (event) => {
			const transaction = request.transaction!;
			transaction.abort();

			context.log(
				'error',
				'Database upgrade needed, but not expected',
				'Expected',
				version,
				'Got',
				request.result.version,
			);
			reject(
				request.error ||
					new Error(
						`Migration error: database version changed unexpectedly when reading current data. Expected ${version}, got ${request.result.version}`,
					),
			);
		};
		request.onsuccess = (event) => {
			resolve(request.result);
		};
		request.onblocked = (event) => {
			reject(new Error('Migration error: database blocked'));
		};
		request.onerror = (event) => {
			reject(new Error('Migration error: database error'));
		};
	});

	db.addEventListener('versionchange', (event) => {
		db.close();
	});

	return db;
}

export async function copyAll(
	sourceDatabase: IDBDatabase,
	targetDatabase: IDBDatabase,
) {
	// DOMStringList... doesn't have iterable... why
	const sourceStoreNames = new Array<string>();
	for (let i = 0; i < sourceDatabase.objectStoreNames.length; i++) {
		sourceStoreNames.push(sourceDatabase.objectStoreNames[i]);
	}

	const copyFromTransaction = sourceDatabase.transaction(
		sourceStoreNames,
		'readonly',
	);
	const copyFromStores = sourceStoreNames.map((name) =>
		copyFromTransaction.objectStore(name),
	);
	const allObjects = await Promise.all(
		copyFromStores.map((store) => storeRequestPromise(store.getAll())),
	);

	const copyToTransaction = targetDatabase.transaction(
		sourceStoreNames,
		'readwrite',
	);
	const copyToStores = sourceStoreNames.map((name) =>
		copyToTransaction.objectStore(name),
	);

	for (let i = 0; i < copyToStores.length; i++) {
		await Promise.all(
			allObjects[i].map((obj) => {
				return storeRequestPromise(copyToStores[i].put(obj));
			}),
		);
	}
}
