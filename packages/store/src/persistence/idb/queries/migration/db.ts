import {
	globalIDB,
	storeRequestPromise,
	openDatabase as baseOpenDatabase,
	getDocumentDbName,
} from '../../util.js';
import { OpenDocumentDbContext } from './types.js';

export async function getDatabaseVersion(
	indexedDB: IDBFactory,
	namespace: string,
): Promise<number> {
	const databaseName = getDocumentDbName(namespace);
	const dbInfo = await indexedDB.databases();
	const existingDb = dbInfo.find((info) => info.name === databaseName);
	if (existingDb) {
		return existingDb.version ?? 0;
	}

	return 0;
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
	const db = await baseOpenDatabase(
		getDocumentDbName(namespace),
		version,
		indexedDB,
	);

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
