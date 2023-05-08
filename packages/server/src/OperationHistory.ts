import { Operation } from '@verdant-web/common';
import { Database } from 'better-sqlite3';
import { OperationSpec } from './types.js';

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
	}: StoredOperationHistoryItem): OperationSpec => {
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

	getEarliest = (libraryId: string, count: number) => {
		return this.db
			.prepare(
				`
      SELECT * FROM OperationHistory
      WHERE libraryId = ?
      ORDER BY timestamp ASC
      LIMIT ?
    `,
			)
			.all(libraryId, count)
			.map(this.hydratePatch);
	};

	getAfter = (libraryId: string, timestamp: string | null = null) => {
		if (timestamp === null) {
			return this.db
				.prepare(
					`
					SELECT * FROM OperationHistory
					WHERE libraryId = ?
					ORDER BY timestamp ASC
				`,
				)
				.all(libraryId)
				.map(this.hydratePatch);
		}
		return this.db
			.prepare(
				`
      SELECT * FROM OperationHistory
      WHERE libraryId = ? AND timestamp > ?
      ORDER BY timestamp ASC
    `,
			)
			.all(libraryId, timestamp)
			.map(this.hydratePatch);
	};

	/**
	 * Returns all operations before the given timestamp
	 * in ascending chronological order
	 */
	getBefore = (libraryId: string, before: string) => {
		return this.db
			.prepare(
				`
			SELECT * FROM OperationHistory
			WHERE libraryId = ? AND timestamp < ?
			ORDER BY timestamp ASC
		`,
			)
			.all(libraryId, before)
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

	/**
	 * Adds a new operation or replaces an existing one.
	 * The server order will be set to the current max + 1
	 */
	insert = (libraryId: string, replicaId: string, item: Operation) => {
		return this.db
			.prepare(
				`
      INSERT OR REPLACE INTO OperationHistory (libraryId, oid, data, timestamp, replicaId, serverOrder)
      VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(serverOrder), 0) FROM OperationHistory WHERE libraryId = ?) + 1)
    `,
			)
			.run(
				libraryId,
				item.oid,
				JSON.stringify(item.data),
				item.timestamp,
				replicaId,
			);
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
		items: Pick<OperationSpec, 'replicaId' | 'oid' | 'timestamp'>[],
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
