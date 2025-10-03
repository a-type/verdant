import { DocumentBaseline, Ref, applyPatch } from '@verdant-web/common';
import { HydratedDocumentBaseline, StoredOperation } from '../../types.js';
import { BaselineStorage } from '../Storage.js';
import { SqliteExecutor } from './database.js';
import { DocumentBaselineRow } from './tables.js';

export class SqlBaselines implements BaselineStorage {
	constructor(
		private db: SqliteExecutor,
		private libraryId: string,
	) {}

	get = async (
		oid: string,
		{ tx }: { tx?: SqliteExecutor } = {},
	): Promise<HydratedDocumentBaseline | null> => {
		return this.#getSync(oid, { tx });
	};
	#getSync = (oid: string, { tx }: { tx?: SqliteExecutor } = {}) => {
		const db = tx ?? this.db;
		const raw = db.first<DocumentBaselineRow>(
			`
					SELECT * FROM DocumentBaseline
					WHERE oid = ?
				`,
			[oid],
		);
		if (!raw) return null;
		this.hydrate(raw);
		return raw as any;
	};

	getAll = async () => {
		const db = this.db;
		const raw = db.query<DocumentBaselineRow>(
			`SELECT * FROM DocumentBaseline ORDER BY timestamp ASC`,
		);

		raw.forEach(this.hydrate);

		return raw as any;
	};

	set = (
		baseline: DocumentBaseline,
		{
			tx,
		}: {
			tx?: SqliteExecutor;
		},
	) => {
		const db = tx ?? this.db;
		if (!baseline.snapshot) {
			return db.exec(`DELETE FROM DocumentBaseline WHERE oid = ?`, [
				baseline.oid,
			]);
		}

		return db.exec(
			`INSERT INTO DocumentBaseline (oid, snapshot, timestamp, authz) VALUES (?, ?, ?, ?)
				ON CONFLICT(oid) DO UPDATE SET
					snapshot = excluded.snapshot,
					timestamp = excluded.timestamp,
					authz = excluded.authz
				`,
			[
				baseline.oid,
				JSON.stringify(baseline.snapshot),
				baseline.timestamp,
				baseline.authz,
			],
		);
	};

	insertAll = async (baselines: DocumentBaseline[]) => {
		const db = this.db;
		return db.transaction((tx) => {
			for (const baseline of baselines) {
				this.set(baseline, { tx });
			}
		});
	};

	private hydrate = (row: DocumentBaselineRow) => {
		// avoiding extra allocation from .map by type-asserting here
		row.snapshot = JSON.parse(row.snapshot);
	};

	applyOperations = async (
		oid: string,
		operations: StoredOperation[],
		deletedRefs?: Ref[],
	) => {
		if (operations.length === 0) return;

		const db = this.db;

		await db.transaction((tx) => {
			let baseline = this.#getSync(oid, { tx });
			if (!baseline) {
				baseline = {
					oid,
					snapshot: {},
					timestamp: operations[0].timestamp,
					libraryId: this.libraryId,
					authz: operations[0].authz,
				};
			}
			for (const operation of operations) {
				baseline.snapshot = applyPatch(
					baseline.snapshot,
					operation.data,
					deletedRefs,
				);
				if (operation.data.op === 'initialize') {
					baseline.authz = operation.authz;
				}
			}
			baseline.timestamp = operations[operations.length - 1].timestamp;
			this.set(baseline, { tx });
		});
	};

	deleteAll = async () => {
		const db = this.db;
		db.exec('DELETE FROM DocumentBaseline;');
	};

	getCount = async () => {
		const db = this.db;
		return (
			db.first<{ count: number }>(
				`SELECT COUNT(*) as count FROM DocumentBaseline;`,
			)?.count ?? 0
		);
	};
}
