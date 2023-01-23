import { Operation } from '@lo-fi/common';
import { Database } from 'better-sqlite3';

type StoredOperationHistoryItem = Omit<Operation, 'data'> & {
	data: string;
	libraryId: string;
	replicaId: string;
};

export type OperationHistoryItem = Operation & {
	replicaId: string;
};

export class OperationHistory {
	constructor(private db: Database) {}

	private hydratePatch = ({
		libraryId: _,
		data,
		...rest
	}: StoredOperationHistoryItem): OperationHistoryItem => {
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

	insert = (libraryId: string, replicaId: string, item: Operation) => {
		return this.db
			.prepare(
				`
      INSERT OR REPLACE INTO OperationHistory (libraryId, oid, data, timestamp, replicaId)
      VALUES (?, ?, ?, ?, ?)
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

	insertAll = async (
		libraryId: string,
		replicaId: string,
		items: Operation[],
	) => {
		const insertStatement = this.db.prepare(
			`
			INSERT OR REPLACE INTO OperationHistory (libraryId, oid, data, timestamp, replicaId)
			VALUES (?, ?, ?, ?, ?)
			`,
		);

		const tx = this.db.transaction(() => {
			for (const item of items) {
				insertStatement.run(
					libraryId,
					item.oid,
					JSON.stringify(item.data),
					item.timestamp,
					replicaId,
				);
			}
		});

		tx();
	};

	dropAll = async (libraryId: string, items: OperationHistoryItem[]) => {
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
