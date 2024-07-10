import {
	Migration,
	MigrationEngine,
	createOid,
	decomposeOid,
	getIndexValues,
	getOidRoot,
} from '@verdant-web/common';
import { Metadata } from '../metadata/Metadata.js';
import { ClientOperation } from '../metadata/OperationsStore.js';
import { acquireLock, openDatabase, upgradeDatabase } from './db.js';
import { getInitialMigrationEngine, getMigrationEngine } from './engine.js';
import { OpenDocumentDbContext } from './types.js';
import { closeDatabase } from '../idb.js';

const globalIDB =
	typeof window !== 'undefined' ? window.indexedDB : (undefined as any);

export async function runMigrations({
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
	/** This namespace value controls where the database being migrated is. */
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
				const originalDatabase = await openDatabase({
					indexedDB,
					namespace,
					version: migration.oldSchema.version,
					context,
				});

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
					if (err instanceof Error) {
						throw err;
					} else {
						throw new Error('Unknown error during migration');
					}
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
			const upgradedDatabase = await applySchemaToDatabase({
				migration,
				indexedDB,
				namespace,
				context,
			});

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

				// add 'touch' operations to all root OIDs of all documents.
				// this marks documents which have undergone a migration
				// so that other clients know when they're working
				// with unmigrated data - by seeing that there are no
				// existing operations or baselines with a timestamp
				// that matches the current version.
				// UPDATE: no longer necessary now that pruning is a thing.
				// await Promise.all(
				// 	oids.map((oid) =>
				// 		meta.insertLocalOperations([
				// 			{
				// 				oid,
				// 				timestamp: meta.time.zero(migration.version),
				// 				data: { op: 'touch' },
				// 			},
				// 		]),
				// 	),
				// );

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
							return putView(writeStore, view);
						} else {
							const { id } = decomposeOid(oid);
							return deleteView(writeStore, id);
						}
					}),
				);
			}

			await closeDatabase(upgradedDatabase);

			context.log('debug', `Migration of ${namespace} complete.`);
			context.log(
				'info',
				`
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
			`,
			);
		}
	});
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

export function applySchemaToDatabase({
	migration,
	indexedDB = globalIDB,
	namespace,
	context,
}: {
	migration: Migration<any>;
	indexedDB?: IDBFactory;
	namespace: string;
	context: OpenDocumentDbContext;
}) {
	return upgradeDatabase(
		indexedDB,
		namespace,
		migration.newSchema.version,
		(transaction, db) => {
			for (const newCollection of migration.addedCollections) {
				db.createObjectStore(newCollection, {
					keyPath: migration.newSchema.collections[newCollection].primaryKey,
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
}
