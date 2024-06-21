import { Kysely, SqliteDialect } from 'kysely';
import { join } from 'path';
import { Database as DatabaseTypes } from './tables.js';
import Database from 'better-sqlite3';
import { migrateToLatest } from '@a-type/kysely';
import migrations from './migrations.js';

export async function openDatabase(
	directory: string,
	libraryId: string,
	options: {
		skipMigrations?: boolean;
		disableWal?: boolean;
	} = {},
) {
	const label = `openDatabase ${libraryId}`;
	console.time(label);
	const filePath =
		directory === ':memory:'
			? ':memory:'
			: join(directory, `${libraryId}.sqlite`);
	const internalDb = new Database(filePath);
	if (!options.disableWal) {
		internalDb.pragma('journal_mode = WAL');
	}
	const db = new Kysely<DatabaseTypes>({
		dialect: new SqliteDialect({
			database: internalDb,
		}),
	});
	// only migrate on first open
	if (!options.skipMigrations) {
		await migrateToLatest(db, migrations);
	}
	console.timeEnd(label);
	return db;
}
