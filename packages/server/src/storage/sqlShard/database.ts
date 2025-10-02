import Database from 'better-sqlite3';
import { join } from 'path';
import { Logger } from '../../logger.js';
import { migrateToLatest } from './migrations.js';

export interface SqliteExecutor {
	query: <O extends Record<string, any>>(
		sql: string,
		parameters?: readonly unknown[],
	) => O[];
	first: <O extends Record<string, any>>(
		sql: string,
		parameters?: readonly unknown[],
	) => O | null;
	exec: (sql: string, parameters?: readonly unknown[]) => void;
	migrate: () => void;
	close: () => void;
	transaction: <T>(cb: (tx: SqliteExecutor) => T) => T | Promise<T>;
	migrated: boolean;
}

export class SqliteExecutor {
	private log;
	constructor(
		partial: Pick<SqliteExecutor, 'query' | 'exec' | 'close'> & {
			createTransaction: (
				exec: SqliteExecutor,
			) => <T>(cb: (tx: SqliteExecutor) => T) => T | Promise<T>;
		},
		{ log }: { log?: Logger } = {},
	) {
		this.log = log || (() => {});
		this.query = partial.query.bind(this) as any;
		this.exec = partial.exec.bind(this);
		this.close = partial.close.bind(this);
		this.transaction = partial.createTransaction(this);
	}

	migrate = () => {
		return migrateToLatest(this, this.log);
	};
	first = <O extends Record<string, any>>(
		sql: string,
		parameters?: readonly unknown[],
	): O | null => {
		const results = this.query<O>(sql, parameters);
		return results[0] ?? null;
	};
	migrated = false;
}

export function openDatabase(executor: SqliteExecutor) {
	executor.migrate();
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
			query: function (sql, parameters = []) {
				const stmt = internalDb.prepare(sql);
				return stmt.all(...parameters) as any;
			},
			exec: function (sql, parameters = []) {
				const stmt = internalDb.prepare(sql);
				stmt.run(...parameters);
			},
			close: function () {
				internalDb.close();
			},
			createTransaction: (exec) => (cb) => {
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
