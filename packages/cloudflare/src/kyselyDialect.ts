import type {
	DurableObjectStorage,
	DurableObjectTransaction,
} from '@cloudflare/workers-types';
import {
	CompiledQuery,
	DatabaseConnection,
	DatabaseIntrospector,
	Dialect,
	Driver,
	Kysely,
	QueryCompiler,
	QueryResult,
	SqliteAdapter,
	SqliteIntrospector,
	SqliteQueryCompiler,
} from 'kysely';

/**
 * Config for the DO SQL dialect. Pass your DO storage parameter defined in your Durable Object constructor.
 */
export interface DODialectConfig {
	storage: DurableObjectStorage;
}

/**
 * Cloudflare Durable Objects SQL dialect that adds support for [DurableObject SQL][0] in [Kysely][1].
 * The constructor takes the instance of your DO SQL storage passed to the DO constructor.
 *
 * ```typescript
 * new DODialect({
 *   database: env.DB,
 * })
 * ```
 *
 * [0]: https://developers.cloudflare.com/durable-objects/api/sql-storage/
 * [1]: https://github.com/koskimas/kysely
 */
export class DODialect implements Dialect {
	#config: DODialectConfig;

	constructor(config: DODialectConfig) {
		this.#config = config;
	}

	createAdapter() {
		return new SqliteAdapter();
	}

	createDriver(): Driver {
		return new D1Driver(this.#config);
	}

	createQueryCompiler(): QueryCompiler {
		return new SqliteQueryCompiler();
	}

	createIntrospector(db: Kysely<any>): DatabaseIntrospector {
		return new SqliteIntrospector(db);
	}
}

class D1Driver implements Driver {
	#config: DODialectConfig;

	constructor(config: DODialectConfig) {
		this.#config = config;
	}

	async init(): Promise<void> {}

	async acquireConnection(): Promise<DatabaseConnection> {
		return new D1Connection(this.#config);
	}

	async beginTransaction(conn: D1Connection): Promise<void> {
		return await conn.beginTransaction();
	}

	async commitTransaction(conn: D1Connection): Promise<void> {
		return await conn.commitTransaction();
	}

	async rollbackTransaction(conn: D1Connection): Promise<void> {
		return await conn.rollbackTransaction();
	}

	async releaseConnection(_conn: D1Connection): Promise<void> {}

	async destroy(): Promise<void> {}
}

class D1Connection implements DatabaseConnection {
	#config: DODialectConfig;
	#transactionClient?: DurableObjectTransaction;
	#transactionResolvable?: {
		resolve: () => void;
		reject: (err: Error) => void;
	};

	constructor(config: DODialectConfig) {
		this.#config = config;
	}

	async executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
		const cursor = this.#config.storage.sql.exec(
			compiledQuery.sql,
			...compiledQuery.parameters,
		);

		const results = cursor.toArray();
		const numAffectedRows =
			cursor.rowsWritten > 0 ? BigInt(cursor.rowsWritten) : undefined;

		return {
			insertId: undefined,
			rows: (results as O[]) || [],
			numAffectedRows,
			// @ts-ignore deprecated in kysely >= 0.23, keep for backward compatibility.
			numUpdatedOrDeletedRows: numAffectedRows,
		};
	}

	async beginTransaction() {
		if (this.#transactionClient)
			throw new Error('Nested transactions not supported');
		this.#config.storage.transaction(async (txn) => {
			this.#transactionClient = txn;
			await new Promise<void>((resolve, reject) => {
				this.#transactionResolvable = { resolve, reject };
			});
		});
	}

	async commitTransaction() {
		if (!this.#transactionClient) throw new Error('No transaction to commit');
		this.#transactionResolvable?.resolve();
		this.#transactionClient = undefined;
	}

	async rollbackTransaction() {
		if (!this.#transactionClient) throw new Error('No transaction to rollback');
		this.#transactionClient.rollback();
		this.#transactionClient = undefined;
	}

	async *streamQuery<O>(
		_compiledQuery: CompiledQuery,
		_chunkSize: number,
	): AsyncIterableIterator<QueryResult<O>> {
		throw new Error('DO SQL Driver does not support streaming');
	}
}
