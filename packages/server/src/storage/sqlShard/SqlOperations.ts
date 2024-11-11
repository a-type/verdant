import { Operation } from '@verdant-web/common';
import { StoredOperation } from '../../types.js';
import { OperationStorage } from '../Storage.js';
import { OperationHistoryRow } from './tables.js';
import { Databases } from './Databases.js';

export class SqlOperations implements OperationStorage {
	constructor(private dbs: Databases, private dialect: 'postgres' | 'sqlite') {}

	private hydrate = (row: OperationHistoryRow) => {
		// avoiding extra allocation from .map by type-asserting here
		row.data = JSON.parse(row.data);
	};

	getAll = async (
		libraryId: string,
		oid: string,
	): Promise<StoredOperation[]> => {
		const db = await this.dbs.get(libraryId);
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
		libraryId: string,
		beforeServerOrder: number,
	): Promise<StoredOperation[]> => {
		const db = await this.dbs.get(libraryId);
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
		libraryId: string,
		afterServerOrder: number,
	): Promise<StoredOperation[]> => {
		const db = await this.dbs.get(libraryId);
		const raw = await db
			.selectFrom('OperationHistory')
			.where('serverOrder', '>', afterServerOrder)
			.orderBy('timestamp', 'asc')
			.selectAll()
			.execute();

		raw.forEach(this.hydrate);
		return raw as unknown as StoredOperation[];
	};

	getLatestServerOrder = async (libraryId: string): Promise<number> => {
		const db = await this.dbs.get(libraryId);
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

	getCount = async (libraryId: string): Promise<number> => {
		const db = await this.dbs.get(libraryId);
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
		libraryId: string,
		replicaId: string,
		operations: Operation[],
	): Promise<void> => {
		const db = await this.dbs.get(libraryId);
		// inserts all operations and updates server order
		// FIXME: this whole thing is kinda sus
		await db.transaction().execute(async (tx): Promise<void> => {
			let orderResult = await tx
				.selectFrom('OperationHistory')
				.select('serverOrder')
				.orderBy('serverOrder', 'desc')
				.limit(1)
				.executeTakeFirst();
			let currentServerOrder = orderResult?.serverOrder ?? 0;
			for (const item of operations) {
				await tx
					.insertInto('OperationHistory')
					.values({
						oid: item.oid,
						data: JSON.stringify(item.data),
						timestamp: item.timestamp,
						replicaId,
						serverOrder: ++currentServerOrder,
						authz: item.authz,
					})
					.onConflict((cb) =>
						cb.columns(['replicaId', 'oid', 'timestamp']).doNothing(),
					)
					.execute();
			}
		});
	};

	deleteAll = async (libraryId: string): Promise<void> => {
		const db = await this.dbs.get(libraryId);
		await db.deleteFrom('OperationHistory').execute();
	};
	delete = async (
		libraryId: string,
		operations: Operation[],
	): Promise<void> => {
		const db = await this.dbs.get(libraryId);
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
