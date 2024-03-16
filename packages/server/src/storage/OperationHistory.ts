import { Operation } from '@verdant-web/common';
import { Database } from 'better-sqlite3';
import { StoredOperation } from '../types.js';

type StoredOperationHistoryItem = Omit<Operation, 'data'> & {
	data: string;
	libraryId: string;
	replicaId: string;
	serverOrder: number;
};

export class OperationHistory {
	constructor(private db: Database) {}

	private hydratePatch = ({
		libraryId: _,
		data,
		...rest
	}: StoredOperationHistoryItem): StoredOperation => {
		return {
			...rest,
			data: JSON.parse(data),
		};
	};

	getAllFor = (libraryId: string, oid: string) => {
		return this.db
			.prepare(
				`
      SELECT * FROM OperationHistory
      WHERE libraryId = ? AND oid = ?
      ORDER BY timestamp ASC
    `,
			)
			.all(libraryId, oid)
			.map(this.hydratePatch);
	};

	/**
	 * Returns all operations before the given server order
	 * in ascending chronological order
	 */
	getBeforeServerOrder = (libraryId: string, beforeServerOrder: number) => {
		return this.db
			.prepare(
				`
			SELECT * FROM OperationHistory
			WHERE libraryId = ? AND serverOrder < ?
			ORDER BY timestamp ASC
		`,
			)
			.all(libraryId, beforeServerOrder)
			.map(this.hydratePatch);
	};

	/**
	 * Returns all operations after a given server order. Useful
	 * for retrieving operations that were created after a client
	 * last synced.
	 */
	getFromServerOrder = (libraryId: string, serverOrder: number) => {
		const result = this.db
			.prepare(
				`
			SELECT * FROM OperationHistory
			WHERE libraryId = ? AND serverOrder > ?
		`,
			)
			.all(libraryId, serverOrder);

		return (result || []).map(this.hydratePatch);
	};

	getLatestServerOrder = (libraryId: string): number => {
		const result = this.db
			.prepare(
				`
			SELECT MAX(serverOrder) AS serverOrder FROM OperationHistory
			WHERE libraryId = ?
		`,
			)
			.get(libraryId);

		return result?.serverOrder || 0;
	};

	getCount = (libraryId: string): number => {
		const result = this.db
			.prepare(
				`
			SELECT COUNT(*) AS count FROM OperationHistory
			WHERE libraryId = ?
		`,
			)
			.get(libraryId);

		return result?.count || 0;
	};

	/**
	 * Inserts all operations and updates the server
	 * order for this library
	 */
	insertAll = async (
		libraryId: string,
		replicaId: string,
		items: Operation[],
	) => {
		const tx = this.db.transaction(() => {
			let orderResult = this.db
				.prepare(
					`
					SELECT COALESCE(MAX(serverOrder), 0) AS serverOrder FROM OperationHistory WHERE libraryId = ?
				`,
				)
				.get(libraryId);
			let currentServerOrder = orderResult.serverOrder || 0;
			const insertStatement = this.db.prepare(
				`
				INSERT OR REPLACE INTO OperationHistory (libraryId, oid, data, timestamp, replicaId, serverOrder)
				VALUES (?, ?, ?, ?, ?, ?)
				`,
			);
			for (const item of items) {
				insertStatement.run(
					libraryId,
					item.oid,
					JSON.stringify(item.data),
					item.timestamp,
					replicaId,
					++currentServerOrder,
				);
			}
		});

		tx();
	};

	dropAll = async (
		libraryId: string,
		items: Pick<StoredOperation, 'replicaId' | 'oid' | 'timestamp'>[],
	) => {
		const deleteStatement = this.db.prepare(
			`
			DELETE FROM OperationHistory
			WHERE libraryId = ? AND replicaId = ? AND oid = ? AND timestamp = ?
			`,
		);

		this.db.transaction(() => {
			for (const item of items) {
				deleteStatement.run(
					libraryId,
					item.replicaId,
					item.oid,
					item.timestamp,
				);
			}
		})();
	};

	deleteAll = (libraryId: string) => {
		this.db
			.prepare(
				`
			DELETE FROM OperationHistory
			WHERE libraryId = ?
			`,
			)
			.run(libraryId);
	};
}
