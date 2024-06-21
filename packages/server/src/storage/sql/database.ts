import { Kysely, SqliteDialect } from 'kysely';
import { Database as DatabaseTypes } from './tables.js';
import Database from 'better-sqlite3';
import { migrateToLatest } from '@a-type/kysely';
import migrations from './migrations.js';

export function openDatabase(
	file: string,
	options: {
		skipMigrations?: boolean;
		disableWal?: boolean;
	} = {},
) {
	const internalDb = new Database(file);
	if (!options.disableWal) {
		internalDb.pragma('journal_mode = WAL');
	}
	const db = new Kysely<DatabaseTypes>({
		dialect: new SqliteDialect({
			database: internalDb,
		}),
	});
	let ready = Promise.resolve<void>(undefined);
	if (!options.skipMigrations) {
		ready = migrateToLatest(db, migrations);
	}

	return {
		db,
		ready,
	};
}
