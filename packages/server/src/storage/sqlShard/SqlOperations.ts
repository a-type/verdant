import { Operation } from '@verdant-web/common';
import { Kysely } from 'kysely';
import { StoredOperation } from '../../types.js';
import { OperationStorage } from '../Storage.js';
import { Database, OperationHistoryRow } from './tables.js';

export class SqlOperations implements OperationStorage {
	constructor(
		private db: Kysely<Database>,
		private libraryId: string,
		private dialect: 'postgres' | 'sqlite',
	) {}

	private hydrate = (row: OperationHistoryRow) => {
		// avoiding extra allocation from .map by type-asserting here
		row.data = JSON.parse(row.data);
	};

	getAll = async (oid: string): Promise<StoredOperation[]> => {
		const db = this.db;
		const raw = await db
			.selectFrom('OperationHistory')
			.where('oid', '=', oid)
			.orderBy('timestamp', 'asc')
			.selectAll()
			.execute();

		raw.forEach(this.hydrate);
		return raw as unknown as StoredOperation[];
	};

	getBeforeServerOrder = async (
		beforeServerOrder: number,
	): Promise<StoredOperation[]> => {
		const db = this.db;
		const raw = await db
			.selectFrom('OperationHistory')
			.where('serverOrder', '<', beforeServerOrder)
			.orderBy('timestamp', 'asc')
			.selectAll()
			.execute();

		raw.forEach(this.hydrate);
		return raw as unknown as StoredOperation[];
	};

	getAfterServerOrder = async (
		afterServerOrder: number,
	): Promise<StoredOperation[]> => {
		const db = this.db;
		const raw = await db
			.selectFrom('OperationHistory')
			.where('serverOrder', '>', afterServerOrder)
			.orderBy('timestamp', 'asc')
			.selectAll()
			.execute();

		raw.forEach(this.hydrate);
		return raw as unknown as StoredOperation[];
	};

	getLatestServerOrder = async (): Promise<number> => {
		const db = this.db;
		const result = await db
			.selectFrom('OperationHistory')
			.orderBy('serverOrder', 'desc')
			.select('serverOrder')
			.limit(1)
			.executeTakeFirst();
		if (result) {
			return result.serverOrder;
		}

		return 0;
	};

	getCount = async (): Promise<number> => {
		const db = this.db;
		return (
			(
				await db
					.selectFrom('OperationHistory')
					.select(({ fn }) => fn.countAll<number>().as('count'))
					.executeTakeFirst()
			)?.count ?? 0
		);
	};

	insertAll = async (
		replicaId: string,
		operations: Operation[],
	): Promise<number> => {
		const db = this.db;
		// inserts all operations and updates server order
		// FIXME: this whole thing is kinda sus
		return await db.transaction().execute(async (tx): Promise<number> => {
			let orderResult = await tx
				.selectFrom('OperationHistory')
				.select('serverOrder')
				.orderBy('serverOrder', 'desc')
				.limit(1)
				.executeTakeFirst();
			let currentServerOrder = orderResult?.serverOrder ?? 0;
			for (const item of operations) {
				// utilizing returned serverOrder accommodates for conflicts
				const result = await tx
					.insertInto('OperationHistory')
					.values({
						oid: item.oid,
						data: JSON.stringify(item.data),
						timestamp: item.timestamp,
						replicaId,
						serverOrder: currentServerOrder + 1,
						authz: item.authz,
					})
					.onConflict((cb) =>
						cb.columns(['replicaId', 'oid', 'timestamp']).doNothing(),
					)
					.returning('serverOrder')
					.executeTakeFirst();
				if (result) {
					currentServerOrder = result.serverOrder;
				} else {
					// on conflict, nothing is returned.
					// this would mean an operation was synced twice.
				}
			}

			return currentServerOrder;
		});
	};

	deleteAll = async (): Promise<void> => {
		const db = this.db;
		await db.deleteFrom('OperationHistory').execute();
	};
	delete = async (operations: Operation[]): Promise<void> => {
		const db = this.db;
		await db.transaction().execute(async (tx) => {
			for (const item of operations) {
				await tx
					.deleteFrom('OperationHistory')
					.where('oid', '=', item.oid)
					.where('timestamp', '=', item.timestamp)
					.execute();
			}
		});
	};
}
