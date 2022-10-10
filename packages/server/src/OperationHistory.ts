import { Operation } from '@lofi/common';
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
	constructor(private db: Database, private libraryId: string) {}

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

	getAllFor = (documentId: string) => {
		return this.db
			.prepare(
				`
      SELECT * FROM OperationHistory
      WHERE libraryId = ? AND documentId = ?
      ORDER BY timestamp ASC
    `,
			)
			.all(this.libraryId, documentId)
			.map(this.hydratePatch);
	};

	getEarliest = (count: number) => {
		return this.db
			.prepare(
				`
      SELECT * FROM OperationHistory
      WHERE libraryId = ?
      ORDER BY timestamp ASC
      LIMIT ?
    `,
			)
			.all(this.libraryId, count)
			.map(this.hydratePatch);
	};

	getAfter = (timestamp: string | null = null) => {
		if (timestamp === null) {
			return this.db
				.prepare(
					`
					SELECT * FROM OperationHistory
					WHERE libraryId = ?
					ORDER BY timestamp ASC
				`,
				)
				.all(this.libraryId)
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
			.all(this.libraryId, timestamp)
			.map(this.hydratePatch);
	};

	/**
	 * Returns all operations before the given timestamp
	 * in ascending chronological order
	 */
	getBefore = (before: string) => {
		return this.db
			.prepare(
				`
			SELECT * FROM OperationHistory
			WHERE libraryId = ? AND timestamp < ?
			ORDER BY timestamp ASC
		`,
			)
			.all(this.libraryId, before)
			.map(this.hydratePatch);
	};

	insert = (replicaId: string, item: Operation) => {
		return this.db
			.prepare(
				`
      INSERT OR REPLACE INTO OperationHistory (libraryId, oid, data, timestamp, replicaId)
      VALUES (?, ?, ?, ?, ?)
    `,
			)
			.run(
				this.libraryId,
				item.oid,
				JSON.stringify(item.data),
				item.timestamp,
				replicaId,
			);
	};

	insertAll = async (replicaId: string, items: Operation[]) => {
		const insertStatement = this.db.prepare(
			`
			INSERT OR REPLACE INTO OperationHistory (libraryId, oid, data, timestamp, replicaId)
			VALUES (?, ?, ?, ?, ?)
			`,
		);

		const tx = this.db.transaction(() => {
			for (const item of items) {
				insertStatement.run(
					this.libraryId,
					item.oid,
					JSON.stringify(item.data),
					item.timestamp,
					replicaId,
				);
			}
		});

		tx();
	};

	dropAll = async (items: OperationHistoryItem[]) => {
		const deleteStatement = this.db.prepare(
			`
			DELETE FROM OperationHistory
			WHERE libraryId = ? AND replicaId = ? AND oid = ? AND timestamp = ?
			`,
		);

		this.db.transaction(() => {
			for (const item of items) {
				deleteStatement.run(
					this.libraryId,
					item.replicaId,
					item.oid,
					item.timestamp,
				);
			}
		})();
	};
}
