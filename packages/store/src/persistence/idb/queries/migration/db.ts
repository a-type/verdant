import { Context } from '../../../../internal.js';
import {
	openDatabase as baseOpenDatabase,
	closeDatabase,
	getDocumentDbName,
	globalIDB,
	storeRequestPromise,
} from '../../util.js';

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
	log?.('debug', 'Upgrading database', namespace, 'to version', version);
	function openAndUpgrade(
		resolve: (db: IDBDatabase) => void,
		reject: (err: Error) => void,
	) {
		const request = indexedDb.open(getDocumentDbName(namespace), version);
		let wasUpgraded = false;
		request.onupgradeneeded = (event) => {
			const transaction = request.transaction!;
			upgrader(transaction, request.result, event);
			wasUpgraded = true;
		};
		request.onsuccess = async (event) => {
			if (wasUpgraded) {
				// close the database
				await closeDatabase(request.result);
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
			log?.('Database upgrade blocked!');
		};
	}
	return new Promise<IDBDatabase>(openAndUpgrade);
}

export async function openDatabase({
	indexedDB = globalIDB,
	namespace,
	version,
	log,
}: {
	indexedDB?: IDBFactory;
	namespace: string;
	version: number;
	log?: Context['log'];
}): Promise<IDBDatabase> {
	log?.('debug', 'Opening database', namespace, 'at version', version);
	const db = await baseOpenDatabase(
		getDocumentDbName(namespace),
		version,
		indexedDB,
	);

	db.addEventListener('versionchange', (event) => {
		db.close();
	});

	db.addEventListener('close', () => {
		log?.('warn', 'Database closed', namespace);
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
