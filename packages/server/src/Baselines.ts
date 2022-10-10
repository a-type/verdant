import { applyPatch, DocumentBaseline, Operation } from '@lofi/common';
import { Database } from 'better-sqlite3';
import { DocumentBaselineSpec } from './types.js';

export class Baselines {
	constructor(private db: Database, private libraryId: string) {}

	get = (oid: string): DocumentBaseline<any> | null => {
		const row = this.db
			.prepare(
				`
      SELECT * FROM DocumentBaseline
      WHERE libraryId = ? AND oid = ?
    `,
			)
			.get(this.libraryId, oid);

		if (!row) {
			return null;
		}

		return this.hydrateSnapshot(row);
	};

	set = (baseline: DocumentBaseline) => {
		return this.db
			.prepare(
				`
      INSERT OR REPLACE INTO DocumentBaseline (libraryId, oid, snapshot, timestamp)
      VALUES (?, ?, ?, ?)
    `,
			)
			.run(
				this.libraryId,
				baseline.oid,
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
				INSERT OR REPLACE INTO DocumentBaseline (libraryId, oid, snapshot, timestamp)
				VALUES (?, ?, ?, ?)
			`,
					)
					.run(
						this.libraryId,
						baseline.oid,
						baseline.snapshot,
						baseline.timestamp,
					);
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

	applyOperations = (oid: string, operations: Operation[]) => {
		if (operations.length === 0) return;

		let baseline = this.get(oid);
		if (!baseline) {
			baseline = {
				oid,
				snapshot: {},
				timestamp: operations[0].timestamp,
			};
		}
		for (const operation of operations) {
			baseline.snapshot = applyPatch(baseline.snapshot, operation.data);
		}
		baseline.timestamp = operations[operations.length - 1].timestamp;
		this.set(baseline);
	};
}
