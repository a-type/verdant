import { Operation } from '@verdant-web/common';
import { StoredOperation } from '../../types.js';
import { OperationStorage } from '../Storage.js';
import { SqliteExecutor } from './database.js';
import { OperationHistoryRow } from './tables.js';

export class SqlOperations implements OperationStorage {
	constructor(
		private db: SqliteExecutor,
		private libraryId: string,
	) {}

	private hydrate = (row: OperationHistoryRow) => {
		// avoiding extra allocation from .map by type-asserting here
		row.data = JSON.parse(row.data);
	};

	getAll = async (oid: string): Promise<StoredOperation[]> => {
		const db = this.db;
		const raw = db.query<OperationHistoryRow>(
			`SELECT * FROM OperationHistory WHERE oid = ? ORDER BY timestamp ASC`,
			[oid],
		);

		raw.forEach(this.hydrate);
		return raw as unknown as StoredOperation[];
	};

	getBeforeServerOrder = async (
		beforeServerOrder: number,
	): Promise<StoredOperation[]> => {
		const db = this.db;
		const raw = db.query<OperationHistoryRow>(
			`SELECT * FROM OperationHistory WHERE serverOrder < ? ORDER BY timestamp ASC`,
			[beforeServerOrder],
		);

		raw.forEach(this.hydrate);
		return raw as unknown as StoredOperation[];
	};

	getAfterServerOrder = async (
		afterServerOrder: number,
	): Promise<StoredOperation[]> => {
		const db = this.db;
		const raw = db.query<OperationHistoryRow>(
			`SELECT * FROM OperationHistory WHERE serverOrder > ? ORDER BY timestamp ASC`,
			[afterServerOrder],
		);

		raw.forEach(this.hydrate);
		return raw as unknown as StoredOperation[];
	};

	getLatestServerOrder = async (): Promise<number> => {
		const db = this.db;
		const result = db.first<Pick<OperationHistoryRow, 'serverOrder'>>(
			`SELECT serverOrder FROM OperationHistory ORDER BY serverOrder DESC LIMIT 1`,
		);
		if (result) {
			return result.serverOrder;
		}

		return 0;
	};

	getCount = async (): Promise<number> => {
		const db = this.db;
		return (
			db.first<{ count: number }>(
				`SELECT COUNT(*) as count FROM OperationHistory`,
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
		return db.transaction((tx): number => {
			let orderResult = tx.first<Pick<OperationHistoryRow, 'serverOrder'>>(
				`SELECT serverOrder FROM OperationHistory ORDER BY serverOrder DESC LIMIT 1`,
			);
			let currentServerOrder = orderResult?.serverOrder ?? 0;
			for (const item of operations) {
				// utilizing returned serverOrder accommodates for conflicts
				const result = tx.first(
					`INSERT INTO OperationHistory (oid, data, timestamp, replicaId, serverOrder, authz) VALUES (?, ?, ?, ?, ?, ?)
						ON CONFLICT (replicaId, oid, timestamp) DO NOTHING
						RETURNING serverOrder`,
					[
						item.oid,
						JSON.stringify(item.data),
						item.timestamp,
						replicaId,
						currentServerOrder + 1,
						item.authz,
					],
				);
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
		db.exec('DELETE FROM OperationHistory');
	};
	delete = async (operations: Operation[]): Promise<void> => {
		const db = this.db;
		return db.transaction((tx) => {
			for (const item of operations) {
				tx.exec(
					`DELETE FROM OperationHistory WHERE oid = ? AND timestamp = ?`,
					[item.oid, item.timestamp],
				);
			}
		});
	};
}
