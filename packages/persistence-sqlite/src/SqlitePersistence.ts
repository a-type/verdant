import {
	Migration,
	PersistenceImplementation,
	PersistenceNamespace,
} from '@verdant-web/store';
import { Context, InitialContext } from '@verdant-web/store/internal';
import {
	collectionIndexName,
	collectionMultiValueIndexTableName,
	collectionTableName,
	Database,
	migrateToLatest,
} from './kysely.js';
import { SqlitePersistenceFileDb } from './files/SqlitePersistenceFileDb.js';
import { SqlitePersistenceMetadataDb } from './metadata/SqlitePersistenceMetadataDb.js';
import { SqlitePersistenceDocumentDb } from './documents/SqlitePersistenceDocumentDb.js';
import { FilesystemImplementation } from './interfaces.js';
import { type Kysely } from 'kysely';

export interface SqlitePersistenceConfig {
	/** This filesystem implementation should implement the required methods for your environment. */
	filesystem: FilesystemImplementation;
	/** This base persistence requires a Kysely instance builder. */
	getKysely: (databaseFile: string) => Kysely<any>;
	/** A directory path where the app can write and read database files. */
	databaseDirectory: string;
	/** A root directory for storing user files. */
	userFilesDirectory: string;
}

export class SqlitePersistence implements PersistenceImplementation {
	name = 'SqlitePersistence';
	constructor(private config: SqlitePersistenceConfig) {}

	private get databasesDirectory() {
		return this.config.databaseDirectory;
	}
	private get filesDirectory() {
		return this.config.userFilesDirectory;
	}
	private get filesystem() {
		return this.config.filesystem;
	}
	private getKysely(namespace: string) {
		return this.config.getKysely(
			`${this.databasesDirectory}/${namespace}.sqlite`,
		);
	}

	getNamespaceVersion = async (namespace: string): Promise<number> => {
		const db = this.getKysely(namespace) as Database;
		try {
			const result = await db
				.selectFrom('__verdant__schemaInfo')
				.where('id', '=', 'schema')
				.select('version')
				.executeTakeFirst();
			if (!result) {
				return 0;
			}
			return result.version;
		} catch (err: any) {
			if (
				err.code === 'SQLITE_ERROR' &&
				err.message.includes('no such table')
			) {
				return 0;
			}
			throw err;
		} finally {
			await db.destroy();
		}
	};
	getNamespaces = async (): Promise<string[]> => {
		const contents = await this.filesystem.readDirectory(
			this.databasesDirectory,
		);
		return Array.from(
			new Set(
				contents.map((fileName) => {
					const match = fileName.match(/(.+)\.sqlite$/);
					return match ? match[1] : null;
				}),
			),
		).filter((n): n is string => !!n);
	};
	deleteNamespace = async (namespace: string): Promise<void> => {
		await this.filesystem.deleteFile(
			`${this.databasesDirectory}/${namespace}.sqlite`,
		);
	};
	copyNamespace = async (from: string, to: string, ctx: InitialContext) => {
		await this.filesystem.copyDirectory({
			from: `${this.databasesDirectory}/${from}.sqlite`,
			to: `${this.databasesDirectory}/${to}.sqlite`,
		});
		await this.filesystem.copyDirectory({
			from: `${this.filesDirectory}/${from}`,
			to: `${this.filesDirectory}/${to}`,
		});
	};
	openNamespace = async (namespace: string, ctx: Pick<Context, 'log'>) => {
		const db = this.getKysely(namespace);
		await migrateToLatest(db);
		return new SqlitePersistenceNamespace(
			namespace,
			db,
			this.filesystem,
			this.filesDirectory,
		);
	};
}

class SqlitePersistenceNamespace implements PersistenceNamespace {
	constructor(
		private namespace: string,
		private db: Database,
		private fs: FilesystemImplementation,
		private filesDirectory: string,
	) {}

	openFiles = async (ctx: Omit<Context, 'files' | 'documents'>) => {
		return new SqlitePersistenceFileDb(
			{
				db: this.db,
				fs: this.fs,
				directory: this.filesDirectory + '/' + this.namespace,
			},
			ctx,
		);
	};
	openMetadata = async (ctx: InitialContext) => {
		return new SqlitePersistenceMetadataDb(this.db);
	};
	openDocuments = async (ctx: Omit<Context, 'documents' | 'files'>) => {
		return new SqlitePersistenceDocumentDb(this.db, ctx);
	};
	applyMigration = async (
		ctx: InitialContext,
		migration: Migration<any>,
	): Promise<void> => {
		ctx.log(
			'debug',
			'applying migration to',
			this.namespace,
			migration.oldSchema.version,
			'->',
			migration.newSchema.version,
		);
		await this.db.transaction().execute(async (tx) => {
			for (const newCollection of migration.addedCollections) {
				const collectionSchema = migration.newSchema.collections[newCollection];
				const primaryKeySchema =
					collectionSchema.fields[collectionSchema.primaryKey];
				if (!primaryKeySchema) {
					throw new Error(
						`Collection ${newCollection} has no primary key field ${collectionSchema.primaryKey}`,
					);
				}
				const primaryKeyType = (sqlTypeMap as any)[primaryKeySchema.type];
				await tx.schema
					.createTable(collectionTableName(newCollection))
					.addColumn('oid', 'text', (b) => b.primaryKey())
					.addColumn('__snapshot__', 'text')
					.addColumn(collectionSchema.primaryKey, primaryKeyType)
					.execute();
				ctx.log(
					'debug',
					'Created collection table',
					collectionTableName(newCollection),
				);
			}

			for (const collection of migration.allCollections) {
				for (const newIndex of migration.addedIndexes[collection] || []) {
					try {
						if (newIndex.multiEntry) {
							// SQLite doesn't support array columns. Instead, we create a separate table
							// for values of this index and join on query.
							const valueType = sqlTypeMap[newIndex.type];
							if (!valueType) {
								throw new Error(
									`Unsupported index type: ${
										newIndex.type
									}. No SQL equivalent is defined. This is a Verdant error; report it to us!

							(debug: ${JSON.stringify(newIndex)})`,
								);
							}
							await tx.schema
								.createTable(
									collectionMultiValueIndexTableName(collection, newIndex.name),
								)
								.addColumn('oid', 'text', (b) =>
									b
										.references(collectionTableName(collection) + '.oid')
										.onDelete('cascade'),
								)
								.addColumn('value', sqlTypeMap[newIndex.type])
								// duplicate values should write to the same row.
								.addPrimaryKeyConstraint(`pk_${collection}_${newIndex.name}`, [
									'oid',
									'value',
								])
								.execute();
							await tx.schema
								.createIndex(collectionIndexName(collection, newIndex.name))
								.on(
									collectionMultiValueIndexTableName(collection, newIndex.name),
								)
								.column('value')
								.execute();
						} else {
							const valueType = sqlTypeMap[newIndex.type];
							if (!valueType) {
								throw new Error(
									`Unsupported index type: ${
										newIndex.type
									}. No SQL equivalent is defined. This is a Verdant error; report it to us!

							(debug: ${JSON.stringify(newIndex)})`,
								);
							}
							await tx.schema
								.alterTable(collectionTableName(collection))
								.addColumn(newIndex.name, sqlTypeMap[newIndex.type])
								.execute();
							await tx.schema
								.createIndex(collectionIndexName(collection, newIndex.name))
								.on(collectionTableName(collection))
								.column(newIndex.name)
								.execute();
						}
					} catch (err) {
						throw new Error(
							`Error creating index ${collection}.${newIndex.name}`,
							{
								cause: err,
							},
						);
					}
				}
				for (const removedIndex of migration.removedIndexes[collection] || []) {
					if (removedIndex.multiEntry) {
						await tx.schema
							.dropTable(
								collectionMultiValueIndexTableName(
									collection,
									removedIndex.name,
								),
							)
							.execute();
					} else {
						await tx.schema
							.alterTable(collectionTableName(collection))
							.dropColumn(removedIndex.name)
							.execute();
					}
					await tx.schema
						.dropIndex(collectionIndexName(collection, removedIndex.name))
						.execute();
				}
			}

			for (const removedCollection of migration.removedCollections) {
				await tx.schema
					.dropTable(collectionTableName(removedCollection))
					.execute();
			}

			// set the user_version to the new version
			ctx.log(
				'debug',
				'Setting schema version to',
				migration.newSchema.version,
			);
			// feels necessary since I had to use raw strings here.
			if (typeof migration.newSchema.version !== 'number') {
				throw new Error(
					`Schema version must be a number. Got: ${migration.newSchema.version}`,
				);
			}
			await tx
				.insertInto('__verdant__schemaInfo')
				.values({ id: 'schema', version: migration.newSchema.version })
				.onConflict((b) =>
					b.column('id').doUpdateSet({
						version: migration.newSchema.version,
					}),
				)
				.execute();
		});
	};
}

const sqlTypeMap = {
	string: 'text',
	number: 'real',
	boolean: 'boolean',
} as const;
