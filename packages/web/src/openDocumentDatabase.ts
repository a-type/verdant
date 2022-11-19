import {
	Migration,
	StorageSchema,
	cloneDeep,
	migrationRange,
	diffToPatches,
	assignIndexValues,
	assignOid,
	removeOidPropertiesFromAllSubObjects,
	assignOidsToAllSubObjects,
	assignOidPropertiesToAllSubObjects,
} from '@lo-fi/common';
import { Metadata } from './metadata/Metadata.js';

const globalIDB =
	typeof window !== 'undefined' ? window.indexedDB : (undefined as any);

export function openDocumentDatabase<Schema extends StorageSchema<any>>({
	schema,
	indexedDB = globalIDB,
	migrations,
	meta,
	namespace,
	log = () => {},
}: {
	schema: Schema;
	migrations: Migration[];
	indexedDB?: IDBFactory;
	meta: Metadata;
	namespace: string;
	log?: (...args: any[]) => void;
}) {
	const { collections, version } = schema;
	// initialize collections as indexddb databases
	const keys = Object.keys(collections);
	log('Initializing database for:', keys);
	const database = new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(
			[namespace, 'collections'].join('_'),
			version,
		);
		request.onupgradeneeded = async (event) => {
			const db = request.result;

			// migrations
			const toRunVersions = migrationRange(event.oldVersion, version);
			const toRun = toRunVersions.map((ver) =>
				migrations.find((m) => m.version === ver),
			);
			if (toRun.some((m) => !m)) {
				throw new Error(`No migration found for version(s) ${toRunVersions}`);
			}

			for (const migration of toRun as Migration[]) {
				for (const newCollection of migration.addedCollections) {
					db.createObjectStore(newCollection, {
						keyPath: migration.newSchema.collections[newCollection].primaryKey,
						autoIncrement: false,
					});
				}

				const transaction = request.transaction!;

				// apply high-level database work on each collection's object store
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

				// do the data migration portion of the migration
				await migration.migrate({
					migrate: (collection, strategy) => {
						return new Promise((resolve, reject) => {
							const collectionSchema =
								migration.newSchema.collections[collection];
							const store = transaction.objectStore(collection);
							const cursorReq = store.openCursor();
							function getMigrationNow() {
								return meta.time.zero(migration.version);
							}
							cursorReq.onsuccess = (event) => {
								const cursor = cursorReq.result;
								if (cursor) {
									const original = cloneDeep(cursor.value);
									// @ts-ignore - excessive type resolution
									const newValue = strategy(cursor.value);
									if (newValue) {
										// remove any removed indexes
										for (const removedIndex of migration.removedIndexes[
											collection
										] || []) {
											if (removedIndex.compound || removedIndex.synthetic) {
												delete (newValue as any)[removedIndex.name];
											}
										}
										// the migration has altered the shape of our document. we need
										// to create the operation from the diff and write it to meta
										// then recompute the document.
										removeOidPropertiesFromAllSubObjects(original);
										removeOidPropertiesFromAllSubObjects(newValue);
										assignOidsToAllSubObjects(newValue);
										const patches = diffToPatches(
											original,
											newValue,
											getMigrationNow,
											[],
										);
										if (patches.length > 0) {
											meta.insertLocalOperation(patches);
										}
									}
									assignOidPropertiesToAllSubObjects(newValue);
									// apply indexes after changes
									assignIndexValues(collectionSchema, newValue);
									cursor.update(newValue);
									cursor.continue();
								} else {
									resolve();
								}
							};
							cursorReq.onerror = (event) => {
								reject(cursorReq.error);
							};
						});
					},
				});

				for (const removedCollection of migration.removedCollections) {
					db.deleteObjectStore(removedCollection);
				}

				log(`
        ⬆️ v${
					migration.newSchema.version
				} Migration complete. Here's the rundown:
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
		};
		request.onsuccess = (event) => {
			resolve(request.result);
		};
		request.onerror = (event) => {
			console.error('Error opening database', request.error);
			reject(request.error);
		};
		request.onblocked = () => {
			// TODO:
			console.warn('Database is blocked');
		};
	});

	return database;
}
