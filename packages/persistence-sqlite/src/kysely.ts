import {
	Kysely,
	Transaction as KTransaction,
	Selectable,
	Migration,
	MigrationProvider,
	Migrator,
	MigrationResult,
} from 'kysely';
import * as metadataMigrations from './metadata/migrations/index.js';

export interface OperationsTable {
	data: string;
	timestamp: string;
	oid: string;
	isLocal: 1 | 0;
	documentOid: string;
	collection: string;
	authz: string | null;
}
export type StoredOperation = Selectable<OperationsTable>;

export interface BaselinesTable {
	oid: string;
	snapshot: string;
	timestamp: string;
	documentOid: string;
	collection: string;
	authz: string | null;
}
export type StoredBaseline = Selectable<BaselinesTable>;

export interface ReplicaInfoTable {
	unused_pk: 'local_replica';
	id: string;
	userId: string | null;
	ackedLogicalTime: string | null;
	lastSyncedLogicalTime: string | null;
}

export interface AckInfoTable {
	id: 'global';
	globalAckTimestamp: string | null;
}

export interface FileInfoTable {
	id: string;
	remote: 1 | 0;
	name: string;
	type: string;
	url: string | null;
	localPath: string | null;
	deletedAt: number | null;
	timestamp: string | null;
}
export type StoredFileInfo = Selectable<FileInfoTable>;

export interface SchemaInfoTable {
	id: 'schema';
	version: number;
}

export interface CollectionTable {
	oid: string;
	__snapshot__: string;
	[field: string]: string | number | boolean | null;
}

export interface CollectionMultiValueIndexTable {
	oid: string;
	value: string | number | boolean | null;
}

export interface Tables {
	__verdant__operations: OperationsTable;
	__verdant__baselines: BaselinesTable;
	__verdant__replicaInfo: ReplicaInfoTable;
	__verdant__ackInfo: AckInfoTable;
	__verdant__fileInfo: FileInfoTable;
	__verdant__schemaInfo: SchemaInfoTable;
	[key: `collection__${string}`]: CollectionTable;
	[key: `collection_index__${string}`]: CollectionMultiValueIndexTable;
}

export type Database = Kysely<Tables>;
export type Transaction = KTransaction<Tables>;

function getMigrator(db: Kysely<any>, migrations: Record<string, Migration>) {
	class RuntimeMigrationProvider implements MigrationProvider {
		constructor() {}

		async getMigrations(): Promise<Record<string, Migration>> {
			return migrations;
		}
	}

	const migrator = new Migrator({
		db,
		provider: new RuntimeMigrationProvider(),
	});
	return migrator;
}

function checkResults({
	error,
	results,
}: {
	error?: unknown;
	results?: MigrationResult[];
}) {
	results?.forEach((it) => {
		if (it.status === 'Success') {
			// console.log(`migration "${it.migrationName}" was executed successfully`);
		} else if (it.status === 'Error') {
			console.error(
				`Verdant metadata failed to execute migration "${it.migrationName}"`,
			);
		}
	});

	if (error) {
		console.trace('Verdant failed to migrate');
		console.error(error);
		throw error;
	}
}

export async function migrateToLatest(db: Kysely<any>) {
	const migrator = getMigrator(db, metadataMigrations);

	const res = await migrator.migrateToLatest();

	checkResults(res);
}

export async function migrateTo(
	db: Kysely<any>,
	migrations: Record<string, Migration>,
	target: string,
) {
	const migrator = getMigrator(db, migrations);

	const res = await migrator.migrateTo(target);

	checkResults(res);
}

export async function migrateDown(
	db: Kysely<any>,
	migrations: Record<string, Migration>,
	count: number,
) {
	const migrator = getMigrator(db, migrations);

	for (let i = 0; i < count; i++) {
		const res = await migrator.migrateDown();

		checkResults(res);
	}
}

export function collectionTableName(
	collection: string,
): `collection__${string}` {
	return `collection__${collection}`;
}

export function collectionIndexName(
	collection: string,
	field: string,
): `index__${string}` {
	return `index__${collection}__${field}`;
}

export function collectionMultiValueIndexTableName(
	collection: string,
	field: string,
): `collection_index__${string}` {
	return `collection_index__${collection}__${field}`;
}
