import type { Database } from 'better-sqlite3';
import * as v0 from './migrations/v0.js';
import * as v1 from './migrations/v1.js';
import * as v2 from './migrations/v2.js';
import * as v3 from './migrations/v3.js';
import * as v4 from './migrations/v4.js';
import * as v5 from './migrations/v5.js';

export const allMigrations: {
	sql?: string;
	procedure?: (db: Database) => void;
}[] = [v0, v1, v2, v3, v4, v5];

export function migrations(db: Database, upTo: number = allMigrations.length) {
	// create the versions table if it doesn't exist
	db.prepare(
		`
    CREATE TABLE IF NOT EXISTS versions (
      version INTEGER NOT NULL PRIMARY KEY
    );
  `,
	).run();

	// get the current version
	const versionResult = db
		.prepare(
			`
    SELECT version FROM versions ORDER BY version DESC LIMIT 1;
  `,
		)
		.get() as { version: number } | undefined;
	const version = versionResult?.version ?? 0;

	const toRun = allMigrations.slice(version, upTo);

	if (toRun.length === 0) {
		console.info('No migrations to run');
		return;
	}

	console.info('Running migrations from ', version, 'to', upTo);

	const run = db.transaction(() => {
		for (const { sql, procedure } of toRun) {
			if (sql) {
				db.exec(sql);
			}
			if (procedure) {
				procedure(db);
			}
		}
		db.prepare(
			`
			INSERT INTO versions (version) VALUES (?);
		`,
		).run(upTo);
	});

	run();
}
