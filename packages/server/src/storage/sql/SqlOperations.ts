import { Operation } from '@verdant-web/common';
import { StoredOperation } from '../../types.js';
import { OperationStorage } from '../Storage.js';
import { Kysely } from 'kysely';
import { Database, OperationHistoryRow } from './tables.js';

export class SqlOperations implements OperationStorage {
	constructor(
		private db: Kysely<Database>,
		private dialect: 'postgres' | 'sqlite',
	) {}

	private hydrate = (row: OperationHistoryRow) => {
		// avoiding extra allocation from .map by type-asserting here
		row.data = JSON.parse(row.data);
	};

	getAll = async (
		libraryId: string,
		oid: string,
	): Promise<StoredOperation[]> => {
		const raw = await this.db
			.selectFrom('OperationHistory')
			.where('libraryId', '=', libraryId)
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
		const raw = await this.db
			.selectFrom('OperationHistory')
			.where('libraryId', '=', libraryId)
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
		const raw = await this.db
			.selectFrom('OperationHistory')
			.where('libraryId', '=', libraryId)
			.where('serverOrder', '>', afterServerOrder)
			.orderBy('timestamp', 'asc')
			.selectAll()
			.execute();

		raw.forEach(this.hydrate);
		return raw as unknown as StoredOperation[];
	};

	getLatestServerOrder = async (libraryId: string): Promise<number> => {
		return (
			(
				await this.db
					.selectFrom('OperationHistory')
					.where('libraryId', '=', libraryId)
					.orderBy('serverOrder', 'desc')
					.select('serverOrder')
					.limit(1)
					.executeTakeFirst()
			)?.serverOrder ?? 0
		);
	};

	getCount = async (libraryId: string): Promise<number> => {
		return (
			(
				await this.db
					.selectFrom('OperationHistory')
					.where('libraryId', '=', libraryId)
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
		// inserts all operations and updates server order
		// FIXME: this whole thing is kinda sus
		await this.db.transaction().execute(async (tx): Promise<void> => {
			let orderResult = await tx
				.selectFrom('OperationHistory')
				.select(({ fn, val }) =>
					fn.coalesce(fn.max<number>('serverOrder'), val(0)).as('serverOrder'),
				)
				.where('libraryId', '=', libraryId)
				.executeTakeFirst();
			let currentServerOrder = orderResult?.serverOrder ?? 0;
			for (const item of operations) {
				await tx
					.insertInto('OperationHistory')
					.values({
						libraryId,
						oid: item.oid,
						data: JSON.stringify(item.data),
						timestamp: item.timestamp,
						replicaId,
						serverOrder: ++currentServerOrder,
						authz: item.authz,
					})
					.onConflict((cb) =>
						cb
							.columns(['libraryId', 'replicaId', 'oid', 'timestamp'])
							.doNothing(),
					)
					.execute();
			}
		});
	};

	deleteAll = async (libraryId: string): Promise<void> => {
		await this.db
			.deleteFrom('OperationHistory')
			.where('libraryId', '=', libraryId)
			.execute();
	};
	delete = async (
		libraryId: string,
		operations: Operation[],
	): Promise<void> => {
		await this.db.transaction().execute(async (tx) => {
			for (const item of operations) {
				await tx
					.deleteFrom('OperationHistory')
					.where('libraryId', '=', libraryId)
					.where('oid', '=', item.oid)
					.where('timestamp', '=', item.timestamp)
					.execute();
			}
		});
	};
}
