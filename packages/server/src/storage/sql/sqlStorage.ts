import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { StorageFactory } from '../Storage.js';
import { SqlBaselines } from './SqlBaselines.js';
import { SqlOperations } from './SqlOperations.js';
import { SqlReplicas } from './SqlReplicas.js';
import { Database as DatabaseTypes } from './tables.js';
import { SqlFileMetadata } from './SqlFileMetadata.js';
import { migrateToLatest } from '@a-type/kysely';
import migrations from './migrations.js';

export const sqlStorage = ({
	databaseFile: dbFile,
	skipMigrations,
}: {
	databaseFile: string;
	skipMigrations?: boolean;
}): StorageFactory => {
	const db = new Kysely<DatabaseTypes>({
		dialect: new SqliteDialect({
			database: new Database(dbFile),
		}),
	});
	if (!skipMigrations) {
		migrateToLatest(db, migrations);
	}
	return (options) => {
		const baselines = new SqlBaselines(db, 'sqlite');
		const operations = new SqlOperations(db, 'sqlite');
		const replicas = new SqlReplicas(
			db,
			options.replicaTruancyMinutes,
			'sqlite',
		);
		const fileMetadata = new SqlFileMetadata(
			db,
			options.fileDeleteExpirationDays,
			'sqlite',
		);
		const close = async () => {
			storage.open = false;
			await db.destroy();
		};
		const storage = {
			baselines,
			operations,
			replicas,
			fileMetadata,
			close,
			open: true,
		};
		return storage;
	};
};
