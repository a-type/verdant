import {
	Migration,
	StorageSchema,
	cloneDeep,
	migrationRange,
	diffToPatches,
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
}: {
	schema: Schema;
	migrations: Migration[];
	indexedDB?: IDBFactory;
	meta: Metadata;
	namespace: string;
}) {
	const { collections, version } = schema;
	// initialize collections as indexddb databases
	const keys = Object.keys(collections);
	console.log('Initializing database for:', keys);
	const database = new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(
			[namespace, 'collections'].join('_'),
			version,
		);
		request.onupgradeneeded = async (event) => {
			const db = request.result;

			// migrations
			const toRunVersions = migrationRange(event.oldVersion, version);
			console.log(event.oldVersion, version, toRunVersions);
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
							unique: newIndex.unique,
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
							const store = transaction.objectStore(collection);
							const cursorReq = store.openCursor();
							function getMigrationNow() {
								return meta.time.zero(migration.version);
							}
							cursorReq.onsuccess = (event) => {
								const cursor = cursorReq.result;
								if (cursor) {
									const original = cloneDeep(cursor.value);
									const newValue = strategy(cursor.value);
									if (newValue) {
										// the migration has altered the shape of our document. we need
										// to create the operation from the diff and write it to meta
										// then recompute the document.
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
