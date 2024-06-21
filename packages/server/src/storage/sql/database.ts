import { Kysely, SqliteDialect } from 'kysely';
import { Database as DatabaseTypes } from './tables.js';
import Database from 'better-sqlite3';
import { migrateToLatest } from '@a-type/kysely';
import migrations from './migrations.js';

export function openDatabase(file: string, skipMigrations?: boolean) {
	const db = new Kysely<DatabaseTypes>({
		dialect: new SqliteDialect({
			database: new Database(file),
		}),
	});
	let ready = Promise.resolve<void>(undefined);
	if (!skipMigrations) {
		ready = migrateToLatest(db, migrations);
	}

	return {
		db,
		ready,
	};
}
