import { Kysely, SqliteDialect } from 'kysely';
import { join } from 'path';
import { Database as DatabaseTypes } from './tables.js';
import Database from 'better-sqlite3';
import { migrateToLatest } from '@a-type/kysely';
import migrations from './migrations.js';

export async function openDatabase(
	directory: string,
	libraryId: string,
	skipMigrations?: boolean,
) {
	const filePath =
		directory === ':memory:'
			? ':memory:'
			: join(directory, `${libraryId}.sqlite`);
	const db = new Kysely<DatabaseTypes>({
		dialect: new SqliteDialect({
			database: new Database(filePath),
		}),
	});
	// only migrate on first open
	if (!skipMigrations) {
		await migrateToLatest(db, migrations);
	}
	return db;
}
