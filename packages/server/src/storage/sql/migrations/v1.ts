import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
	await db.schema
		.createTable('DocumentBaseline')
		.ifNotExists()
		.addColumn('oid', 'text')
		.addColumn('snapshot', 'text')
		.addColumn('timestamp', 'text', (cb) => cb.notNull())
		.addColumn('libraryId', 'text', (cb) => cb.notNull())
		.addPrimaryKeyConstraint('DocumentBaseline_primaryKey', [
			'libraryId',
			'oid',
		])
		.execute();

	await db.schema
		.createTable('OperationHistory')
		.ifNotExists()
		.addColumn('oid', 'text', (cb) => cb.notNull())
		.addColumn('timestamp', 'text', (cb) => cb.notNull())
		.addColumn('data', 'text', (cb) => cb.notNull())
		.addColumn('serverOrder', 'integer', (cb) => cb.notNull().defaultTo(0))
		.addColumn('replicaId', 'text', (cb) => cb.notNull())
		.addColumn('libraryId', 'text', (cb) => cb.notNull())
		.addPrimaryKeyConstraint('OperationHistory_primaryKey', [
			'libraryId',
			'replicaId',
			'oid',
			'timestamp',
		])
		.execute();

	await db.schema
		.createTable('ReplicaInfo')
		.ifNotExists()
		.addColumn('id', 'text')
		.addColumn('libraryId', 'text', (cb) => cb.notNull())
		.addColumn('clientId', 'text', (cb) => cb.notNull())
		.addColumn('lastSeenWallClockTime', 'integer')
		.addColumn('ackedLogicalTime', 'text')
		.addColumn('type', 'integer', (cb) => cb.notNull().defaultTo(0))
		.addColumn('ackedServerOrder', 'integer', (cb) => cb.notNull().defaultTo(0))
		.addPrimaryKeyConstraint('ReplicaInfo_primaryKey', ['libraryId', 'id'])
		.execute();

	await db.schema
		.createTable('FileMetadata')
		.ifNotExists()
		.addColumn('libraryId', 'text', (cb) => cb.notNull())
		.addColumn('fileId', 'text', (cb) => cb.notNull())
		.addColumn('name', 'text', (cb) => cb.notNull())
		.addColumn('type', 'text', (cb) => cb.notNull())
		.addColumn('pendingDeleteAt', 'integer')
		.addPrimaryKeyConstraint('FileMetadata_primaryKey', ['libraryId', 'fileId'])
		.execute();
}

export async function down(db: Kysely<any>) {
	await db.schema.dropTable('DocumentBaseline').execute();
	await db.schema.dropTable('OperationHistory').execute();
	await db.schema.dropTable('ReplicaInfo').execute();
	await db.schema.dropTable('FileMetadata').execute();
}
