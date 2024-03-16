import {
	applyPatch,
	DocumentBaseline,
	Operation,
	Ref,
} from '@verdant-web/common';
import { Database } from 'better-sqlite3';
import {
	StoredDocumentBaseline,
	HydratedDocumentBaseline,
	StoredOperation,
} from '../types.js';

export class Baselines {
	constructor(private db: Database) {}

	get = (libraryId: string, oid: string): HydratedDocumentBaseline | null => {
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

	getAll = (libraryId: string): DocumentBaseline<any>[] => {
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
	};

	private set = (libraryId: string, baseline: DocumentBaseline) => {
		if (!baseline.snapshot) {
			return this.db
				.prepare(
					`
			DELETE FROM DocumentBaseline
			WHERE libraryId = ? AND oid = ?
		`,
				)
				.run(libraryId, baseline.oid);
		}

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
		snapshot: StoredDocumentBaseline,
	): HydratedDocumentBaseline => {
		return {
			...snapshot,
			snapshot: JSON.parse(snapshot.snapshot),
		};
	};

	applyOperations = (
		libraryId: string,
		oid: string,
		operations: StoredOperation[],
		deletedRefs?: Ref[],
	) => {
		if (operations.length === 0) return [];

		let baseline = this.get(libraryId, oid);
		if (!baseline) {
			baseline = {
				oid,
				snapshot: {},
				timestamp: operations[0].timestamp,
				libraryId,
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

	getCount = (libraryId: string): number => {
		return (
			this.db
				.prepare(
					`
			SELECT COUNT(*) AS count FROM DocumentBaseline
			WHERE libraryId = ?
		`,
				)
				.get(libraryId)?.count ?? 0
		);
	};
}
