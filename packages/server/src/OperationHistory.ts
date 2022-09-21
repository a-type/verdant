import { SyncOperation } from '@lofi/common';
import { Database } from 'better-sqlite3';
import { OperationHistoryItemSpec } from './types.js';

export class OperationHistory {
	constructor(private db: Database, private libraryId: string) {}

	private hydrateOperation = (operation: OperationHistoryItemSpec) => {
		return {
			...operation,
			patch: JSON.parse(operation.patch),
		};
	};

	getAllFor = (documentId: string): SyncOperation[] => {
		return this.db
			.prepare(
				`
      SELECT * FROM OperationHistory
      WHERE libraryId = ? AND documentId = ?
      ORDER BY timestamp ASC
    `,
			)
			.all(this.libraryId, documentId)
			.map(this.hydrateOperation);
	};

	getEarliest = (count: number): SyncOperation[] => {
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
			.map(this.hydrateOperation);
	};

	getAfter = (timestamp: string | null = null): SyncOperation[] => {
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
				.map(this.hydrateOperation);
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
			.map(this.hydrateOperation);
	};

	/**
	 * Returns all operations before the given timestamp
	 * in ascending chronological order
	 */
	getBefore = (before: string): SyncOperation[] => {
		return this.db
			.prepare(
				`
			SELECT * FROM OperationHistory
			WHERE libraryId = ? AND timestamp < ?
			ORDER BY timestamp ASC
		`,
			)
			.all(this.libraryId, before)
			.map(this.hydrateOperation);
	};

	insert = (item: SyncOperation) => {
		return this.db
			.prepare(
				`
      INSERT OR REPLACE INTO OperationHistory (id, libraryId, collection
      , documentId, patch, timestamp, replicaId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
			)
			.run(
				item.id,
				this.libraryId,
				item.collection,
				item.documentId,
				JSON.stringify(item.patch),
				item.timestamp,
				item.replicaId,
			);
	};

	insertAll = async (items: SyncOperation[]) => {
		const insertStatement = this.db.prepare(
			`
			INSERT OR REPLACE INTO OperationHistory (id, libraryId, collection
			, documentId, patch, timestamp, replicaId)
			VALUES (?, ?, ?, ?, ?, ?, ?)
			`,
		);

		const tx = this.db.transaction(() => {
			for (const item of items) {
				insertStatement.run(
					item.id,
					this.libraryId,
					item.collection,
					item.documentId,
					JSON.stringify(item.patch),
					item.timestamp,
					item.replicaId,
				);
			}
		});

		tx();
	};

	dropAll = async (items: SyncOperation[]) => {
		const deleteStatement = this.db.prepare(
			`
			DELETE FROM OperationHistory
			WHERE id = ?
			`,
		);

		this.db.transaction(() => {
			for (const item of items) {
				deleteStatement.run(item.id);
			}
		})();
	};
}
