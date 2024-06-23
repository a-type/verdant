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
import { Databases } from './Databases.js';
import { transferToShards } from './transfer.js';
import { existsSync, mkdirSync, readdirSync } from 'fs';

export const sqlShardStorage = ({
	databasesDirectory,
	transferFromUnifiedDatabaseFile,
	disableWal,
	closeTimeout,
}: {
	databasesDirectory: string;
	transferFromUnifiedDatabaseFile?: string;
	disableWal?: boolean;
	closeTimeout?: number;
}): StorageFactory => {
	let ready = Promise.resolve<void>(undefined);
	if (databasesDirectory !== ':memory:' && !existsSync(databasesDirectory)) {
		mkdirSync(databasesDirectory);
		console.info(`Created databases directory: ${databasesDirectory}`);
	}
	if (transferFromUnifiedDatabaseFile) {
		// check if directory is empty
		const files =
			databasesDirectory === ':memory:' ? [] : readdirSync(databasesDirectory);
		if (files.length > 0) {
			console.error(
				`Cannot transfer from unified database to non-empty directory: ${databasesDirectory}. This might mean the transfer has already happened and you're free to turn off the transferFromUnifiedDatabaseFile option.`,
			);
		} else {
			ready = transferToShards({
				file: transferFromUnifiedDatabaseFile,
				directory: databasesDirectory,
			}).then();
		}
	}
	const dbs = new Databases({
		directory: databasesDirectory,
		disableWal,
		closeTimeout,
	});
	return (options) => {
		const baselines = new SqlBaselines(dbs, 'sqlite');
		const operations = new SqlOperations(dbs, 'sqlite');
		const replicas = new SqlReplicas(
			dbs,
			options.replicaTruancyMinutes,
			'sqlite',
		);
		const fileMetadata = new SqlFileMetadata(
			dbs,
			options.fileDeleteExpirationDays,
			'sqlite',
		);
		const close = async () => {
			storage.open = false;
			await dbs.destroy();
		};
		const storage = {
			baselines,
			operations,
			replicas,
			fileMetadata,
			close,
			open: false,
			ready: ready.then(() => {
				storage.open = true;
			}),
		};
		return storage;
	};
};
