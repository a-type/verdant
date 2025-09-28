import { existsSync, mkdirSync } from 'fs';
import {
	defaultFileExpirationDays,
	defaultReplicaTruancyMinutes,
} from '../../defaults.js';
import { Logger } from '../../logger.js';
import { Storage, StorageFactory, StorageOptions } from '../Storage.js';
import { Databases } from './Databases.js';
import { SqlBaselines } from './SqlBaselines.js';
import { SqlFileMetadata } from './SqlFileMetadata.js';
import { SqlOperations } from './SqlOperations.js';
import { SqlReplicas } from './SqlReplicas.js';
import { SqliteExecutor } from './database.js';

export const sqlShardStorage = ({
	databasesDirectory,
	disableWal,
	closeTimeout,
	fileDeleteExpirationDays = defaultFileExpirationDays,
	replicaTruancyMinutes = defaultReplicaTruancyMinutes,
	log,
}: {
	databasesDirectory: string;
	disableWal?: boolean;
	closeTimeout?: number;
	databases?: Databases;
	log?: Logger;
} & StorageOptions): StorageFactory => {
	if (databasesDirectory !== ':memory:' && !existsSync(databasesDirectory)) {
		mkdirSync(databasesDirectory);
		console.info(`Created databases directory: ${databasesDirectory}`);
	}
	const dbs = new Databases({
		directory: databasesDirectory,
		disableWal,
		closeTimeout,
		log,
	});
	return async (libraryId) => {
		const db = await dbs.get(libraryId);
		return new SqlShardStorage(db, {
			fileDeleteExpirationDays,
			replicaTruancyMinutes,
			libraryId,
		});
	};
};

export class SqlShardStorage implements Storage {
	baselines;
	operations;
	replicas;
	fileMetadata;

	#open = true;
	get open() {
		return this.#open;
	}

	constructor(
		private db: SqliteExecutor,
		options: Required<StorageOptions> & { libraryId: string },
	) {
		this.baselines = new SqlBaselines(db, options.libraryId);
		this.operations = new SqlOperations(db, options.libraryId);
		this.replicas = new SqlReplicas(
			db,
			options.libraryId,
			options.replicaTruancyMinutes,
		);
		this.fileMetadata = new SqlFileMetadata(
			db,
			options.libraryId,
			options.fileDeleteExpirationDays,
		);
	}

	close = async () => {
		this.#open = false;
		await this.db.close();
	};
}
