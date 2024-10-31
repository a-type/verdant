import { Database, Tables } from './kysely.js';
import { QueryMode } from '@verdant-web/store';
import { Transaction } from './kysely.js';

export class SqliteService {
	constructor(protected db: Database) {}

	transaction<T>(
		opts: { mode?: QueryMode; storeNames: string[]; abort?: AbortSignal },
		procedure: (tx: Transaction) => Promise<T>,
	): Promise<T> {
		return this.db
			.transaction()
			.setIsolationLevel(
				opts.mode === 'readwrite' ? 'serializable' : 'read uncommitted',
			)
			.execute(procedure);
	}

	protected tableStats = async (tableName: keyof Tables) => {
		return await this.db
			.selectFrom(tableName)
			.select((eb) => [eb.fn.countAll<number>().as('count')])
			.executeTakeFirst();
	};
}
