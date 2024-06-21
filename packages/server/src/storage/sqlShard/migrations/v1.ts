import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
	await db.schema
		.createTable('DocumentBaseline')
		.ifNotExists()
		.addColumn('oid', 'text', (cb) => cb.primaryKey())
		.addColumn('snapshot', 'text')
		.addColumn('timestamp', 'text', (cb) => cb.notNull())
		.execute();

	await db.schema
		.createTable('OperationHistory')
		.ifNotExists()
		.addColumn('oid', 'text', (cb) => cb.notNull())
		.addColumn('timestamp', 'text', (cb) => cb.notNull())
		.addColumn('data', 'text', (cb) => cb.notNull())
		.addColumn('serverOrder', 'integer', (cb) => cb.notNull().defaultTo(0))
		.addColumn('replicaId', 'text', (cb) => cb.notNull())
		.addPrimaryKeyConstraint('OperationHistory_primaryKey', [
			'replicaId',
			'oid',
			'timestamp',
		])
		.execute();

	await db.schema
		.createTable('ReplicaInfo')
		.ifNotExists()
		.addColumn('id', 'text', (cb) => cb.primaryKey())
		.addColumn('clientId', 'text', (cb) => cb.notNull())
		.addColumn('lastSeenWallClockTime', 'integer')
		.addColumn('ackedLogicalTime', 'text')
		.addColumn('type', 'integer', (cb) => cb.notNull().defaultTo(0))
		.addColumn('ackedServerOrder', 'integer', (cb) => cb.notNull().defaultTo(0))
		.execute();

	await db.schema
		.createTable('FileMetadata')
		.ifNotExists()
		.addColumn('fileId', 'text', (cb) => cb.primaryKey())
		.addColumn('name', 'text', (cb) => cb.notNull())
		.addColumn('type', 'text', (cb) => cb.notNull())
		.addColumn('pendingDeleteAt', 'integer')
		.execute();
}

export async function down(db: Kysely<any>) {
	await db.schema.dropTable('DocumentBaseline').execute();
	await db.schema.dropTable('OperationHistory').execute();
	await db.schema.dropTable('ReplicaInfo').execute();
	await db.schema.dropTable('FileMetadata').execute();
}
