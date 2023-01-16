import type { Database } from 'better-sqlite3';
import v0Sql from './migrations/v0.sql.js';
import v1Sql from './migrations/v1.sql.js';
import v2Sql from './migrations/v2.sql.js';

export function migrations(db: Database) {
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

	if (version === 0) {
		const run = db.transaction(() => {
			db.exec(v0Sql);
			db.exec(v1Sql);
			db.prepare(
				`
        INSERT INTO versions (version) VALUES (1);
      `,
			).run();
		});

		run();
	} else if (version === 1) {
		const run = db.transaction(() => {
			db.exec(v2Sql);
			db.prepare(
				`
				INSERT INTO versions (version) VALUES (2);
			`,
			).run();
		});

		run();
	}
}
