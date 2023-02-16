import type { Database } from 'better-sqlite3';
import v0Sql from './migrations/v0.sql.js';
import v1Sql from './migrations/v1.sql.js';
import v2Sql from './migrations/v2.sql.js';
import v3Sql from './migrations/v3.sql.js';
import v4Sql from './migrations/v4.sql.js';

const allMigrations = [v0Sql, v1Sql, v2Sql, v3Sql, v4Sql];

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

	const sqlToRun = allMigrations.slice(version);

	if (sqlToRun.length === 0) return;

	console.info(
		'Running migrations from ',
		version,
		'to',
		allMigrations.length - 1,
	);

	const run = db.transaction(() => {
		sqlToRun.forEach((sql) => db.exec(sql));
		db.prepare(
			`
			INSERT INTO versions (version) VALUES (?);
		`,
		).run(allMigrations.length);
	});

	run();
}
