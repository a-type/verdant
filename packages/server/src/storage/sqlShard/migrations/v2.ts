import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
	// add authz column to OperationHistory and DocumentBaseline
	await db.schema
		.alterTable('OperationHistory')
		.addColumn('authz', 'text', (cb) => cb.defaultTo(null))
		.execute();

	await db.schema
		.alterTable('DocumentBaseline')
		.addColumn('authz', 'text', (cb) => cb.defaultTo(null))
		.execute();
}

export async function down(db: Kysely<any>) {
	await db.schema.alterTable('OperationHistory').dropColumn('authz').execute();

	await db.schema.alterTable('DocumentBaseline').dropColumn('authz').execute();
}
