import { Migration } from '@verdant-web/common';
import { ContextWithoutPersistence } from '../../context/context.js';
import {
	PersistenceFileDb,
	PersistenceImplementation,
	PersistenceNamespace,
} from '../interfaces.js';
import { IdbPersistenceFileDb } from './files/IdbPersistenceFileDb.js';
import { IdbMetadataDb } from './metadata/IdbMetadataDb.js';
import { openMetadataDatabase } from './metadata/openMetadataDatabase.js';
import { IdbDocumentDb } from './queries/IdbDocumentDb.js';
import { openDatabase, upgradeDatabase } from './queries/migration/db.js';
import {
	closeDatabase,
	deleteDatabase,
	getDocumentDbName,
	getMetadataDbName,
	getNamespaceFromDatabaseInfo,
	overwriteDatabase,
} from './util.js';

export class IdbPersistence implements PersistenceImplementation {
	name = 'IdbPersistence';
	constructor(private indexedDB: IDBFactory = window.indexedDB) {}

	getNamespaces = async (): Promise<string[]> => {
		// list all idb database names
		const dbs = await this.indexedDB.databases();
		return Array.from(
			new Set<string>(
				dbs.map(getNamespaceFromDatabaseInfo).filter((n): n is string => !!n),
			),
		);
	};

	getNamespaceVersion = async (namespace: string): Promise<number> => {
		const databaseName = getDocumentDbName(namespace);
		const dbInfo = await this.indexedDB.databases();
		const existingDb = dbInfo.find((info) => info.name === databaseName);
		if (existingDb) {
			return existingDb.version ?? 0;
		}

		return 0;
	};

	deleteNamespace = async (namespace: string): Promise<void> => {
		await Promise.all([
			deleteDatabase(getMetadataDbName(namespace), this.indexedDB),
			deleteDatabase([namespace, 'collections'].join('_'), this.indexedDB),
		]);
	};

	openNamespace = async (
		namespace: string,
	): Promise<IdbPersistenceNamespace> => {
		return new IdbPersistenceNamespace(this.indexedDB, namespace);
	};

	copyNamespace = async (
		from: string,
		to: string,
		ctx: ContextWithoutPersistence,
	): Promise<void> => {
		const fromCtx = ctx.cloneWithOptions({
			namespace: from,
		}) as ContextWithoutPersistence;
		const toCtx = ctx.cloneWithOptions({
			namespace: to,
		}) as ContextWithoutPersistence;
		const { db: fromMetaDb } = await openMetadataDatabase({
			indexedDB: this.indexedDB,
			log: fromCtx.log,
			namespace: fromCtx.namespace,
		});

		// no need to involve files, as they store all data
		// in the metadata database.

		const fromDocumentsDb = await openDatabase({
			indexedDB: this.indexedDB,
			namespace: fromCtx.namespace,
			version: fromCtx.schema.version,
			log: fromCtx.log,
		});

		fromCtx.log(
			'info',
			`Copying data from ${fromCtx.namespace} to ${toCtx.namespace}`,
		);

		await overwriteDatabase(
			fromMetaDb,
			getMetadataDbName(toCtx.namespace),
			toCtx,
			this.indexedDB,
		);
		await overwriteDatabase(
			fromDocumentsDb,
			getDocumentDbName(toCtx.namespace),
			toCtx,
			this.indexedDB,
		);

		await closeDatabase(fromMetaDb);
		await closeDatabase(fromDocumentsDb);
	};
}

class IdbPersistenceNamespace implements PersistenceNamespace {
	constructor(
		private indexedDB: IDBFactory,
		private namespace: string,
	) {}
	private metadataDb: IDBDatabase | undefined;

	openFiles(ctx: ContextWithoutPersistence): Promise<PersistenceFileDb> {
		if (!this.metadataDb) {
			throw new Error(
				'Metadata database must be opened first. This is a bug in Verdant.',
			);
		}
		return Promise.resolve(new IdbPersistenceFileDb(this.metadataDb, ctx));
	}

	openMetadata = async (ctx: ContextWithoutPersistence) => {
		const { db } = await openMetadataDatabase({
			indexedDB: this.indexedDB,
			log: ctx.log,
			namespace: this.namespace,
		});
		this.metadataDb = db;
		ctx.persistenceShutdownHandler.register(() => closeDatabase(db));
		return new IdbMetadataDb(db, ctx);
	};

	openDocuments = async (ctx: ContextWithoutPersistence) => {
		const db = await openDatabase({
			version: ctx.schema.version,
			indexedDB: this.indexedDB,
			log: ctx.log,
			namespace: this.namespace,
		});
		ctx.persistenceShutdownHandler.register(() => closeDatabase(db));
		return new IdbDocumentDb(db, ctx);
	};

	applyMigration = async (
		ctx: ContextWithoutPersistence,
		migration: Migration<any>,
	): Promise<void> => {
		ctx.log(
			'debug',
			'Applying migration',
			migration.newSchema.version,
			migration,
		);
		await upgradeDatabase(
			this.indexedDB,
			this.namespace,
			migration.newSchema.version,
			(transaction, db) => {
				for (const newCollection of migration.addedCollections) {
					db.createObjectStore(newCollection, {
						keyPath: migration.newSchema.collections[newCollection].primaryKey,
						autoIncrement: false,
					});
				}

				for (const collection of migration.allCollections) {
					if (!db.objectStoreNames.contains(collection)) {
						throw new Error(
							`Expected object store for collection ${collection} to exist during migration, but it did not`,
						);
					}
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
			ctx.log,
		);
	};
}
