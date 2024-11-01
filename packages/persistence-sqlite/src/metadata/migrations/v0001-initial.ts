import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
	await db.schema
		.createTable('__verdant__operations')
		.addColumn('data', 'text', (b) => b.notNull())
		.addColumn('timestamp', 'text', (b) => b.notNull())
		.addColumn('oid', 'text', (b) => b.notNull())
		.addColumn('isLocal', 'integer', (b) => b.notNull())
		.addColumn('documentOid', 'text', (b) => b.notNull())
		.addColumn('collection', 'text', (b) => b.notNull())
		.addColumn('authz', 'text')
		.addPrimaryKeyConstraint('operation_pk', ['oid', 'timestamp'])
		.execute();
	await db.schema
		.createIndex('operation_collection_idx')
		.on('__verdant__operations')
		.column('collection')
		.execute();
	await db.schema
		.createIndex('operation_oid_idx')
		.on('__verdant__operations')
		.column('oid')
		.execute();
	await db.schema
		.createIndex('operation_document_oid_idx')
		.on('__verdant__operations')
		.column('documentOid')
		.execute();
	await db.schema
		.createIndex('operation_is_local_idx')
		.on('__verdant__operations')
		.column('isLocal')
		.execute();

	await db.schema
		.createTable('__verdant__baselines')
		.addColumn('oid', 'text', (b) => b.primaryKey())
		.addColumn('snapshot', 'text', (b) => b.notNull())
		.addColumn('timestamp', 'text', (b) => b.notNull())
		.addColumn('documentOid', 'text', (b) => b.notNull())
		.addColumn('collection', 'text', (b) => b.notNull())
		.addColumn('authz', 'text')
		.execute();
	await db.schema
		.createIndex('baseline_collection_idx')
		.on('__verdant__baselines')
		.column('collection')
		.execute();
	await db.schema
		.createIndex('baseline_document_oid_idx')
		.on('__verdant__baselines')
		.column('documentOid')
		.execute();

	await db.schema
		.createTable('__verdant__replicaInfo')
		.addColumn('unused_pk', 'text', (b) =>
			b.primaryKey().defaultTo('local_replica'),
		)
		.addColumn('id', 'text', (b) => b.notNull())
		.addColumn('userId', 'text')
		.addColumn('ackedLogicalTime', 'text')
		.addColumn('lastSyncedLogicalTime', 'text')
		.execute();

	await db.schema
		.createTable('__verdant__ackInfo')
		.addColumn('id', 'text', (b) => b.primaryKey().defaultTo('global'))
		.addColumn('globalAckTimestamp', 'text')
		.execute();

	await db.schema
		.createTable('__verdant__fileInfo')
		.addColumn('id', 'text', (b) => b.primaryKey())
		.addColumn('remote', 'integer', (b) => b.notNull())
		.addColumn('name', 'text', (b) => b.notNull())
		.addColumn('type', 'text', (b) => b.notNull())
		.addColumn('url', 'text')
		.addColumn('localPath', 'text')
		.addColumn('deletedAt', 'integer')
		.addColumn('timestamp', 'text')
		.execute();

	await db.schema
		.createTable('__verdant__schemaInfo')
		.addColumn('id', 'text', (b) => b.primaryKey())
		.addColumn('version', 'integer', (b) => b.notNull())
		.execute();
}

export async function down(db: Kysely<any>) {
	await db.schema.dropTable('__verdant__operations').execute();
	await db.schema.dropTable('__verdant__baselines').execute();
	await db.schema.dropTable('__verdant__replicaInfo').execute();
	await db.schema.dropTable('__verdant__ackInfo').execute();
	await db.schema.dropTable('__verdant__fileInfo').execute();
	await db.schema.dropTable('__verdant__schemaInfo').execute();
}
