import { Database, Tables } from './kysely.js';
import { QueryMode } from '@verdant-web/store';
import { Transaction } from './kysely.js';
import { Disposable } from '../../store/src/utils/Disposable.js';

export class SqliteService extends Disposable {
	private globalAbortController = new AbortController();

	constructor(protected db: Database) {
		super();
		this.addDispose(() => {
			this.globalAbortController.abort();
		});
	}

	transaction = async <T>(
		opts: { mode?: QueryMode; storeNames: string[]; abort?: AbortSignal },
		procedure: (tx: Transaction) => Promise<T>,
	): Promise<T> => {
		if (this.globalAbortController.signal.aborted) {
			throw new Error('Global abort signal is already aborted');
		}
		// return this.db.transaction().execute(procedure);
		const result = await procedure(this.db as any);
		return result;
	};

	protected tableStats = async (tableName: keyof Tables) => {
		return await this.db
			.selectFrom(tableName)
			.select((eb) => [eb.fn.countAll<number>().as('count')])
			.executeTakeFirst();
	};
}
