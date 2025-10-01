import { SqliteExecutor } from '@verdant-web/server/internals';

export function createDurableObjectSqliteExecutor(
	storage: DurableObjectStorage,
	{ log }: { log?: (level: string, ...args: any[]) => void } = {},
): SqliteExecutor {
	return new SqliteExecutor(
		{
			close: async () => {},
			query: async <O extends Record<string, any>>(
				sql: string,
				params: readonly unknown[] = [],
			) => {
				const cursor = storage.sql.exec<O>(sql, ...params);
				const results: O[] = [];
				let result = cursor.next();
				while (!result.done) {
					results.push(result.value);
					result = cursor.next();
				}
				return results;
			},
			createTransaction: (exec) => (cb) =>
				storage.transaction(async () => {
					return cb(exec);
				}),
			exec: async (sql: string, params: readonly unknown[] = []) => {
				storage.sql.exec(sql, ...params);
			},
		},
		{ log },
	);
}
