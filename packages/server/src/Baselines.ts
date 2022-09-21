import { applyPatch, DocumentBaseline, SyncOperation } from '@lofi/common';
import { Database } from 'better-sqlite3';
import { DocumentBaselineSpec } from './types.js';

export class Baselines {
	constructor(private db: Database, private libraryId: string) {}

	get = (documentId: string): DocumentBaseline<any> | null => {
		const row = this.db
			.prepare(
				`
      SELECT * FROM DocumentBaseline
      WHERE libraryId = ? AND documentId = ?
    `,
			)
			.get(this.libraryId, documentId);

		if (!row) {
			return null;
		}

		return this.hydrateSnapshot(row);
	};

	set = (baseline: DocumentBaseline) => {
		return this.db
			.prepare(
				`
      INSERT OR REPLACE INTO DocumentBaseline (libraryId, documentId, snapshot, timestamp)
      VALUES (?, ?, ?, ?)
    `,
			)
			.run(
				this.libraryId,
				baseline.documentId,
				JSON.stringify(baseline.snapshot),
				baseline.timestamp,
			);
	};

	insertAll = (baselines: DocumentBaseline[]) => {
		const tx = this.db.transaction(() => {
			for (const baseline of baselines) {
				this.db
					.prepare(
						`
				INSERT OR REPLACE INTO DocumentBaseline (libraryId, documentId, snapshot)
				VALUES (?, ?, ?)
			`,
					)
					.run(this.libraryId, baseline.documentId, baseline.snapshot);
			}
		});
		tx();
	};

	private hydrateSnapshot = (
		snapshot: DocumentBaselineSpec,
	): DocumentBaseline<any> => {
		return {
			...snapshot,
			snapshot: JSON.parse(snapshot.snapshot),
		};
	};

	getAllAfter = (timestamp: string | null): DocumentBaseline<any>[] => {
		if (!timestamp) {
			console.log('query', this.libraryId);
			return this.db
				.prepare(
					`
					SELECT * FROM DocumentBaseline
					WHERE libraryId = ?
					ORDER BY timestamp ASC
				`,
				)
				.all(this.libraryId)
				.map(this.hydrateSnapshot);
		}
		return this.db
			.prepare(
				`
      SELECT * FROM DocumentBaseline
      WHERE libraryId = ? AND timestamp > ?
      ORDER BY timestamp ASC
    `,
			)
			.all(this.libraryId, timestamp)
			.map(this.hydrateSnapshot);
	};

	applyOperations = (documentId: string, operations: SyncOperation[]) => {
		if (operations.length === 0) return;

		let baseline = this.get(documentId);
		if (!baseline) {
			baseline = {
				documentId,
				snapshot: {},
				timestamp: operations[0].timestamp,
			};
		}
		for (const operation of operations) {
			baseline.snapshot = applyPatch(baseline.snapshot, operation.patch);
		}
		baseline.timestamp = operations[operations.length - 1].timestamp;
		this.set(baseline);
	};
}
