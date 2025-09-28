import { Logger } from '../../logger.js';
import { SqliteExecutor } from './database.js';
import * as v1 from './migrations/v1.js';
import * as v2 from './migrations/v2.js';

export async function getMigrationVersion(run: SqliteExecutor['query']) {
	try {
		const result = await run(
			`SELECT id FROM _Migrations
			ORDER BY id DESC
			LIMIT 1;`,
		);
		const value = result[0]?.id ?? 0;
		return value;
	} catch (e) {
		if (
			e instanceof Error &&
			e.message.includes('no such table: _Migrations')
		) {
			return 0;
		}
		throw e;
	}
}

export async function updateMigrationVersion(
	run: SqliteExecutor['exec'],
	version: number,
) {
	await run(`INSERT INTO _Migrations (id, appliedAt) VALUES (?, ?)`, [
		version,
		Date.now(),
	]);
}

export async function migrateToLatest(
	e: Pick<SqliteExecutor, 'exec' | 'query' | 'migrated'>,
	log: Logger,
) {
	const allMigrations = [v1, v2];

	const currentVersion = await getMigrationVersion(e.query);

	const pendingMigrations = allMigrations.slice(currentVersion);
	if (pendingMigrations.length === 0) {
		e.migrated = true;
		return;
	}
	log('info', `Applying ${pendingMigrations.length} pending migrations...`);
	for (const migration of pendingMigrations) {
		for (const step of migration.up) {
			try {
				await e.exec(step);
			} catch (err) {
				log('error', `Error applying migration v${migration.version}:`, err);
				log('error', `SQL:`, step);
				throw err;
			}
		}
		log('info', `Applied migration v${migration.version}`);
	}

	await updateMigrationVersion(
		e.exec,
		allMigrations[allMigrations.length - 1].version,
	);

	e.migrated = true;
}
