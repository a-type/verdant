import {
	applyPatch,
	DocumentBaseline,
	getAllFileFields,
	Operation,
	Ref,
} from '@lo-fi/common';
import { Database } from 'better-sqlite3';
import { DocumentBaselineSpec } from './types.js';

export class Baselines {
	constructor(private db: Database) {}

	get = (libraryId: string, oid: string): DocumentBaseline<any> | null => {
		const row = this.db
			.prepare(
				`
      SELECT * FROM DocumentBaseline
      WHERE libraryId = ? AND oid = ?
    `,
			)
			.get(libraryId, oid);

		if (!row) {
			return null;
		}

		return this.hydrateSnapshot(row);
	};

	getAllWithSubObjects = (
		libraryId: string,
		oid: string,
	): DocumentBaseline<any>[] => {
		const rows = this.db
			.prepare(
				`
			SELECT * FROM DocumentBaseline
			WHERE libraryId = ? AND oid LIKE ?
		`,
			)
			.all(libraryId, `${oid}%`);

		return rows.map(this.hydrateSnapshot);
	};

	set = (libraryId: string, baseline: DocumentBaseline) => {
		return this.db
			.prepare(
				`
      INSERT OR REPLACE INTO DocumentBaseline (libraryId, oid, snapshot, timestamp)
      VALUES (?, ?, ?, ?)
    `,
			)
			.run(
				libraryId,
				baseline.oid,
				JSON.stringify(baseline.snapshot),
				baseline.timestamp,
			);
	};

	insertAll = (libraryId: string, baselines: DocumentBaseline[]) => {
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
						libraryId,
						baseline.oid,
						JSON.stringify(baseline.snapshot),
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

	getAllAfter = (
		libraryId: string,
		timestamp: string | null,
	): DocumentBaseline<any>[] => {
		if (!timestamp) {
			return this.db
				.prepare(
					`
					SELECT * FROM DocumentBaseline
					WHERE libraryId = ?
					ORDER BY timestamp ASC
				`,
				)
				.all(libraryId)
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
			.all(libraryId, timestamp)
			.map(this.hydrateSnapshot);
	};

	applyOperations = (
		libraryId: string,
		oid: string,
		operations: Operation[],
		deletedRefs?: Ref[],
	) => {
		if (operations.length === 0) return [];

		let baseline = this.get(libraryId, oid);
		if (!baseline) {
			baseline = {
				oid,
				snapshot: {},
				timestamp: operations[0].timestamp,
			};
		}
		for (const operation of operations) {
			baseline.snapshot = applyPatch(
				baseline.snapshot,
				operation.data,
				deletedRefs,
			);
		}
		baseline.timestamp = operations[operations.length - 1].timestamp;
		this.set(libraryId, baseline);
	};

	deleteAll = (libraryId: string) => {
		this.db
			.prepare(
				`
			DELETE FROM DocumentBaseline
			WHERE libraryId = ?
		`,
			)
			.run(libraryId);
	};
}
