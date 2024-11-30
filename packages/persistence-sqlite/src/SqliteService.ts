import { QueryMode } from '@verdant-web/store';
import { Disposable } from '@verdant-web/store/internal';
import { Database, Tables, Transaction } from './kysely.js';

export class SqliteService extends Disposable {
	private globalAbortController = new AbortController();

	constructor(protected db: Database) {
		super();
		this.addDispose(() => {
			if (this.globalAbortController.signal.aborted) return;
			try {
				this.globalAbortController.abort();
			} catch (err) {
				if (err instanceof Error && err.message.includes('invocation')) {
					// Ignore
					return;
				}
				console.error('Error aborting global controller', err);
			}
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
