import {
	CollectionFilter,
	Migration,
	MigrationEngine,
	ObjectIdentifier,
	StorageSchema,
	addFieldDefaults,
	assert,
	assignIndexValues,
	assignOidPropertiesToAllSubObjects,
	assignOidsToAllSubObjects,
	cloneDeep,
	createOid,
	decomposeOid,
	diffToPatches,
	getIndexValues,
	getOidRoot,
	hasOid,
	initialToPatches,
	removeOidPropertiesFromAllSubObjects,
} from '@verdant-web/common';
import { Context } from '../context.js';
import { storeRequestPromise } from '../idb.js';
import { Metadata } from '../metadata/Metadata.js';
import { ClientOperation } from '../metadata/OperationsStore.js';
import { findAllOids, findOneOid } from '../queries/dbQueries.js';
import {
	acquireLock,
	closeDatabase,
	getDatabaseVersion,
	openDatabase,
	upgradeDatabase,
} from './db.js';
import { getMigrationPath } from './paths.js';

const globalIDB =
	typeof window !== 'undefined' ? window.indexedDB : (undefined as any);

type OpenDocumentDbContext = Omit<Context, 'documentDb'>;

export async function openDocumentDatabase({
	version,
	indexedDB = globalIDB,
	migrations,
	meta,
	context,
}: {
	version: number;
	migrations: Migration<any>[];
	indexedDB?: IDBFactory;
	meta: Metadata;
	context: OpenDocumentDbContext;
}) {
	if (context.schema.wip) {
		throw new Error('Cannot open a production client with a WIP schema!');
	}

	const currentVersion = await getDatabaseVersion(
		indexedDB,
		context.namespace,
		version,
		context.log,
	);

	context.log(
		'debug',
		'Current database version:',
		currentVersion,
		'target version:',
		version,
	);

	const toRun = getMigrationPath({
		currentVersion,
		targetVersion: version,
		migrations,
	});

	if (toRun.length > 0) {
		context.log(
			'debug',
			'Migrations to run:',
			toRun.map((m) => m.version),
		);
		await runMigrations({ context, toRun, meta, indexedDB });
	}
	return openDatabase(indexedDB, context.namespace, version, context.log);
}

export async function openWIPDocumentDatabase({
	version,
	indexedDB = globalIDB,
	migrations,
	meta,
	context,
	wipNamespace,
}: {
	version: number;
	migrations: Migration<any>[];
	indexedDB?: IDBFactory;
	meta: Metadata;
	context: OpenDocumentDbContext;
	wipNamespace: string;
}) {
	context.log('debug', 'Opening WIP database', wipNamespace);
	const currentWIPVersion = await getDatabaseVersion(
		indexedDB,
		wipNamespace,
		version,
		context.log,
	);

	if (currentWIPVersion === version) {
		context.log('info', `WIP schema is up-to-date; not refreshing database`);
	} else {
		context.log('info', `WIP schema is out-of-date; refreshing database`);

		// first we need to copy the data from the production database to the WIP database
		// at the current (non-wip) version.

		const initialToRun = getMigrationPath({
			currentVersion: currentWIPVersion,
			targetVersion: version - 1,
			migrations,
		});

		if (initialToRun.length > 0) {
			await runMigrations({
				context,
				toRun: initialToRun,
				meta,
				indexedDB,
				namespace: wipNamespace,
			});

			// now, we copy the data from the main database.
			const mainDatabase = await openDatabase(
				indexedDB,
				context.namespace,
				version - 1,
				context.log,
			);

			const wipDatabase = await openDatabase(
				indexedDB,
				wipNamespace,
				version - 1,
				context.log,
			);

			// DOMStringList... doesn't have iterable... why
			const mainDatabaseStoreNames = new Array<string>();
			for (let i = 0; i < mainDatabase.objectStoreNames.length; i++) {
				mainDatabaseStoreNames.push(mainDatabase.objectStoreNames[i]);
			}

			const copyFromTransaction = mainDatabase.transaction(
				mainDatabaseStoreNames,
				'readonly',
			);
			const copyFromStores = mainDatabaseStoreNames.map((name) =>
				copyFromTransaction.objectStore(name),
			);
			const allObjects = await Promise.all(
				copyFromStores.map((store) => storeRequestPromise(store.getAll())),
			);

			const copyToTransaction = wipDatabase.transaction(
				mainDatabaseStoreNames,
				'readwrite',
			);
			const copyToStores = mainDatabaseStoreNames.map((name) =>
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

		const toRun = getMigrationPath({
			currentVersion: version - 1,
			targetVersion: version,
			migrations,
		});

		if (toRun.length > 0) {
			await runMigrations({
				context,
				toRun,
				meta,
				indexedDB,
				namespace: wipNamespace,
			});
		}
	}

	return openDatabase(indexedDB, wipNamespace, version, context.log);
}

async function runMigrations({
	context,
	toRun,
	meta,
	indexedDB = globalIDB,
	namespace = context.namespace,
}: {
	context: OpenDocumentDbContext;
	toRun: Migration<any>[];
	meta: Metadata;
	indexedDB?: IDBFactory;
	namespace?: string;
}) {
	await acquireLock(namespace, async () => {
		// now the fun part
		for (const migration of toRun) {
			// special case: if this is the version 1 migration, we have no pre-existing database
			// to use for the migration.
			let engine: MigrationEngine;
			// migrations from 0 (i.e. initial migrations) don't attempt to open an existing db
			if (migration.oldSchema.version === 0) {
				engine = getInitialMigrationEngine({
					meta,
					migration,
					context,
				});
				await migration.migrate(engine);
			} else {
				// open the database with the current (old) version for this migration. this should
				// align with the database's current version.
				const originalDatabase = await openDatabase(
					indexedDB,
					namespace,
					migration.oldSchema.version,
					context.log,
				);

				// this will only write to our metadata store via operations!
				engine = getMigrationEngine({
					meta,
					migration,
					context: {
						...context,
						documentDb: originalDatabase,
					},
				});
				try {
					await migration.migrate(engine);
					// wait on any out-of-band async operations to complete
					await Promise.all(engine.awaitables);
				} catch (err) {
					context.log(
						'critical',
						`Migration failed (${migration.oldSchema.version} -> ${migration.newSchema.version})`,
						err,
					);
					throw err;
				}

				// now we have to open the database again with the next version and
				// make the appropriate schema changes during the upgrade.
				await closeDatabase(originalDatabase);
			}

			context.log(
				'debug',
				'Upgrading database',
				namespace,
				'to version',
				migration.newSchema.version,
			);
			await upgradeDatabase(
				indexedDB,
				namespace,
				migration.newSchema.version,
				(transaction, db) => {
					for (const newCollection of migration.addedCollections) {
						db.createObjectStore(newCollection, {
							keyPath:
								migration.newSchema.collections[newCollection].primaryKey,
							autoIncrement: false,
						});
					}

					for (const collection of migration.allCollections) {
						const store = transaction.objectStore(collection);
						// apply new indexes
						for (const newIndex of migration.addedIndexes[collection] || []) {
							store.createIndex(newIndex.name, newIndex.name, {
								multiEntry: newIndex.multiEntry,
							});
						}
						// remove old indexes
						for (const oldIndex of migration.removedIndexes[collection] || []) {
							store.deleteIndex(oldIndex.name);
						}
					}
					for (const removedCollection of migration.removedCollections) {
						// !! can't delete the store, because old operations that relate to
						// this store may still exist in history. instead, we can clear it out
						// and leave it in place
						transaction.objectStore(removedCollection).clear();
					}
				},
				context.log,
			);

			/**
			 * In cases where operations from the future have been
			 * received by this client, we may have created entire
			 * documents in metadata which were not written to storage
			 * because all of their operations were in the future (
			 * i.e. in the next version). We have to find those documents
			 * and also write their snapshots to storage, because they
			 * won't be present in storage already to 'refresh,' so
			 * if we don't analyze metadata for 'future' operations like
			 * this, we won't know they exist.
			 *
			 * This led to behavior where the metadata would be properly
			 * synced, but after upgrading the app and migrating, items
			 * would be missing from findAll and findOne queries.
			 */
			const docsWithUnappliedMigrations = await getDocsWithUnappliedMigrations({
				meta,
				currentVersion: migration.oldSchema.version,
				newVersion: migration.newSchema.version,
			});

			// once the schema is ready, we can write back the migrated documents
			const upgradedDatabase = await openDatabase(
				indexedDB,
				namespace,
				migration.newSchema.version,
				context.log,
			);
			for (const collection of migration.allCollections) {
				// first step is to read in all the keys we need to rewrite
				const documentReadTransaction = upgradedDatabase.transaction(
					collection,
					'readwrite',
				);
				const readStore = documentReadTransaction.objectStore(collection);
				const keys = await getAllKeys(readStore);
				// map the keys to OIDs
				const oids = keys.map((key) => createOid(collection, `${key}`));
				oids.push(
					...engine.newOids.filter((oid) => {
						return decomposeOid(oid).collection === collection;
					}),
					...docsWithUnappliedMigrations.filter((oid) => {
						return decomposeOid(oid).collection === collection;
					}),
				);

				const snapshots = await Promise.all(
					oids.map(async (oid) => {
						try {
							const snap = await meta.getDocumentSnapshot(oid);
							return [oid, snap];
						} catch (e) {
							// this seems to happen with baselines/ops which are not fully
							// cleaned up after deletion?
							context.log(
								'error',
								'Could not regenerate snapshot during migration for oid',
								oid,
								'this document will not be preserved',
								e,
							);
							return null;
						}
					}),
				);

				const views = snapshots
					.filter((s): s is [string, any] => !!s)
					.map(([oid, snapshot]) => {
						if (!snapshot) return [oid, undefined];
						const view = getIndexValues(
							migration.newSchema.collections[collection],
							snapshot,
						);
						return [oid, view];
					});

				// now we can write the documents back
				const documentWriteTransaction = upgradedDatabase.transaction(
					collection,
					'readwrite',
				);
				const writeStore = documentWriteTransaction.objectStore(collection);
				await Promise.all(
					views.map(([oid, view]) => {
						if (view) {
							return putView(writeStore, view).catch((err) => {
								view;
								throw err;
							});
						} else {
							const { id } = decomposeOid(oid);
							return deleteView(writeStore, id);
						}
					}),
				);
			}

			await closeDatabase(upgradedDatabase);

			context.log('debug', `Migration of ${namespace} complete.`);
			context.log(`
				⬆️ v${migration.newSchema.version} Migration complete. Here's the rundown:
					- Added collections: ${migration.addedCollections.join(', ')}
					- Removed collections: ${migration.removedCollections.join(', ')}
					- Changed collections: ${migration.changedCollections.join(', ')}
					- New indexes: ${Object.keys(migration.addedIndexes)
						.map((col) =>
							migration.addedIndexes[col].map((i) => `${col}.${i.name}`),
						)
						.flatMap((i) => i)
						.join(', ')}
					- Removed indexes: ${Object.keys(migration.removedIndexes)
						.map((col) =>
							migration.removedIndexes[col].map((i) => `${col}.${i.name}`),
						)
						.flatMap((i) => i)
						.join(', ')}
			`);
		}
	});
}

function getMigrationMutations({
	migration,
	meta,
	getMigrationNow,
	newOids,
}: {
	migration: Migration<any>;
	newOids: string[];
	getMigrationNow: () => string;
	meta: Metadata;
}) {
	return migration.allCollections.reduce((acc, collectionName) => {
		acc[collectionName] = {
			put: async (doc: any) => {
				// add defaults
				addFieldDefaults(migration.newSchema.collections[collectionName], doc);
				const primaryKey =
					doc[migration.newSchema.collections[collectionName].primaryKey];
				const oid = createOid(collectionName, primaryKey);
				newOids.push(oid);
				await meta.insertLocalOperation(
					initialToPatches(doc, oid, getMigrationNow),
				);
				return doc;
			},
			delete: (id: string) => {
				const oid = createOid(collectionName, id);
				return meta.insertLocalOperation([
					{
						oid,
						timestamp: getMigrationNow(),
						data: { op: 'delete' },
					},
				]);
			},
		};
		return acc;
	}, {} as any);
}

function getMigrationQueries({
	migration,
	context,
	meta,
}: {
	migration: Migration<any>;
	context: Context;
	meta: Metadata;
}) {
	return migration.oldCollections.reduce((acc, collectionName) => {
		acc[collectionName] = {
			get: async (id: string) => {
				const oid = createOid(collectionName, id);
				const doc = await meta.getDocumentSnapshot(oid, {
					// only get the snapshot up to the previous version (newer operations may have synced)
					to: meta.time.now(migration.oldSchema.version),
				});
				return doc;
			},
			findOne: async (filter: CollectionFilter) => {
				const oid = await findOneOid({
					collection: collectionName,
					index: filter,
					context,
				});
				if (!oid) return null;
				const doc = await meta.getDocumentSnapshot(oid, {
					// only get the snapshot up to the previous version (newer operations may have synced)
					to: meta.time.now(migration.oldSchema.version),
				});
				return doc;
			},
			findAll: async (filter: CollectionFilter) => {
				const oids = await findAllOids({
					collection: collectionName,
					index: filter,
					context,
				});
				const docs = await Promise.all(
					oids.map((oid) =>
						meta.getDocumentSnapshot(oid, {
							// only get the snapshot up to the previous version (newer operations may have synced)
							to: meta.time.now(migration.oldSchema.version),
						}),
					),
				);
				return docs;
			},
		};
		return acc;
	}, {} as any);
}

function getMigrationEngine({
	meta,
	migration,
	context,
}: {
	log?: (...args: any[]) => void;
	migration: Migration;
	meta: Metadata;
	context: Context;
}): MigrationEngine {
	function getMigrationNow() {
		return meta.time.zero(migration.version);
	}

	const newOids = new Array<ObjectIdentifier>();

	const queries = getMigrationQueries({
		migration,
		context,
		meta,
	});
	const mutations = getMigrationMutations({
		migration,
		getMigrationNow,
		newOids,
		meta,
	});
	const awaitables = new Array<Promise<any>>();
	const engine: MigrationEngine = {
		log: context.log,
		newOids,
		migrate: async (collection, strategy) => {
			const docs = await queries[collection].findAll();

			await Promise.all(
				docs.filter(Boolean).map(async (doc: any) => {
					assert(
						hasOid(doc),
						`Document is missing an OID: ${JSON.stringify(doc)}`,
					);
					const original = cloneDeep(doc);
					// remove any indexes before computing the diff
					// const collectionSpec = migration.oldSchema.collections[collection];
					// const indexKeys = [
					// 	...Object.keys(collectionSpec.synthetics || {}),
					// 	...Object.keys(collectionSpec.compounds || {}),
					// ];
					// indexKeys.forEach((key) => {
					// 	delete doc[key];
					// });
					// @ts-ignore - excessive type resolution
					const newValue = await strategy(doc);
					if (newValue) {
						// the migration has altered the shape of our document. we need
						// to create the operation from the diff and write it to meta as
						// a migration patch
						removeOidPropertiesFromAllSubObjects(original);
						removeOidPropertiesFromAllSubObjects(newValue);
						assignOidsToAllSubObjects(newValue);
						const patches = diffToPatches(
							original,
							newValue,
							getMigrationNow,
							undefined,
							[],
							{
								mergeUnknownObjects: true,
							},
						);
						if (patches.length > 0) {
							await meta.insertLocalOperation(patches);
						}
					}
				}),
			);
		},
		queries,
		mutations,
		awaitables,
	};
	return engine;
}

function getInitialMigrationEngine({
	meta,
	migration,
	context,
}: {
	context: OpenDocumentDbContext;
	migration: Migration;
	meta: Metadata;
}): MigrationEngine {
	function getMigrationNow() {
		return meta.time.zero(migration.version);
	}

	const newOids = new Array<ObjectIdentifier>();

	const queries = new Proxy({} as any, {
		get() {
			throw new Error(
				'Queries are not available in initial migrations; there is no database yet!',
			);
		},
	}) as any;

	const mutations = getMigrationMutations({
		migration,
		getMigrationNow,
		newOids,
		meta,
	});
	const engine: MigrationEngine = {
		log: context.log,
		newOids,
		migrate: () => {
			throw new Error(
				'Calling migrate() in initial migrations is not supported! Use initial migrations to seed initial data using mutations.',
			);
		},
		queries,
		mutations,
		awaitables: [],
	};
	return engine;
}

async function getAllKeys(store: IDBObjectStore) {
	return new Promise<IDBValidKey[]>((resolve, reject) => {
		const request = store.getAllKeys();
		request.onsuccess = (event) => {
			resolve(request.result);
		};
		request.onerror = (event) => {
			reject(request.error);
		};
	});
}

async function deleteView(store: IDBObjectStore, id: string) {
	const request = store.delete(id);
	return new Promise<void>((resolve, reject) => {
		request.onsuccess = (event) => {
			resolve();
		};
		request.onerror = (event) => {
			reject(request.error);
		};
	});
}

async function putView(store: IDBObjectStore, view: any) {
	const request = store.put(view);
	return new Promise<void>((resolve, reject) => {
		request.onsuccess = (event) => {
			resolve();
		};
		request.onerror = (event) => {
			reject(request.error);
		};
	});
}

/**
 * Gets a list of root OIDs for all documents which had operations stored already
 * that were not applied to their queryable snapshots because they were in the
 * future. These documents need to be refreshed in storage.
 */
async function getDocsWithUnappliedMigrations({
	meta,
	currentVersion,
	newVersion: _,
}: {
	currentVersion: number;
	newVersion: number;
	meta: Metadata;
}) {
	// scan for all operations in metadata after the current version.
	// this could be more efficient if also filtering below or equal newVersion but
	// that seems so unlikely in practice...
	const unappliedOperations: ClientOperation[] = [];
	await meta.operations.iterateOverAllOperations(
		(op) => unappliedOperations.push(op),
		{
			from: meta.time.zero(currentVersion + 1),
		},
	);
	return Array.from(
		new Set(unappliedOperations.map((op) => getOidRoot(op.oid))),
	);
}
