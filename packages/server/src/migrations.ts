import type { Database } from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import dirname from './dirname.cjs';

const __dirname = dirname as unknown as string;

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
		const v0Migration = fs.readFileSync(
			path.resolve(__dirname, './migrations/v0.sql'),
			'utf8',
		);
		const v1Migration = fs.readFileSync(
			path.resolve(__dirname, './migrations/v1.sql'),
			'utf8',
		);
		const run = db.transaction(() => {
			db.exec(v0Migration);
			db.exec(v1Migration);
			db.prepare(
				`
        INSERT INTO versions (version) VALUES (1);
      `,
			).run();
		});

		run();
	}
}
