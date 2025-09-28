import Database from 'better-sqlite3';
import { join } from 'path';
import { Logger } from '../../logger.js';
import { migrateToLatest } from './migrations.js';

export interface SqliteExecutor {
	query: <O extends Record<string, any>>(
		sql: string,
		parameters?: readonly unknown[],
	) => Promise<O[]>;
	first: <O extends Record<string, any>>(
		sql: string,
		parameters?: readonly unknown[],
	) => Promise<O | null>;
	exec: (sql: string, parameters?: readonly unknown[]) => Promise<void>;
	migrate: () => Promise<void>;
	close: () => Promise<void>;
	transaction: <T>(cb: (tx: SqliteExecutor) => Promise<T>) => Promise<T>;
	migrated: boolean;
	silenceTrace?: boolean;
}

export class SqliteExecutor {
	private log;
	constructor(
		partial: Pick<SqliteExecutor, 'query' | 'exec' | 'close'> & {
			createTransaction: (
				exec: SqliteExecutor,
			) => <T>(cb: (tx: SqliteExecutor) => Promise<T>) => Promise<T>;
		},
		{ log }: { log?: Logger } = {},
	) {
		this.log = log || (() => {});
		this.query = partial.query.bind(this) as any;
		this.exec = partial.exec.bind(this);
		this.close = partial.close.bind(this);
		this.transaction = partial.createTransaction(this);
	}

	migrate = async () => {
		await migrateToLatest(this, this.log);
	};
	first = async <O extends Record<string, any>>(
		sql: string,
		parameters?: readonly unknown[],
	): Promise<O | null> => {
		const results = await this.query<O>(sql, parameters);
		return results[0] ?? null;
	};
	migrated = false;
}

export async function openDatabase(executor: SqliteExecutor) {
	await executor.migrate();
	return executor;
}

export function createFilesystemExecutor(
	directory: string,
	libraryId: string,
	options: {
		disableWal?: boolean;
		log?: Logger;
	} = {},
): SqliteExecutor {
	const label = `openDatabase ${libraryId}`;
	console.time(label);
	const filePath =
		directory === ':memory:'
			? ':memory:'
			: join(directory, `${libraryId}.sqlite`);
	const internalDb = new Database(filePath);
	if (!options.disableWal) {
		internalDb.pragma('journal_mode = WAL');
	}
	console.timeEnd(label);

	return new SqliteExecutor(
		{
			query: async function (sql, parameters = []) {
				const stmt = internalDb.prepare(sql);
				return stmt.all(...parameters) as any;
			},
			exec: async function (sql, parameters = []) {
				const stmt = internalDb.prepare(sql);
				stmt.run(...parameters);
			},
			close: async function () {
				internalDb.close();
			},
			createTransaction: (exec) => async (cb) => {
				const tx = internalDb.transaction(() => {
					return cb(exec);
				});
				return tx();
			},
		},
		{
			log: options.log ?? (() => {}),
		},
	);
}
