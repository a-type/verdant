import { DocumentBaseline, Ref, applyPatch } from '@verdant-web/common';
import { Kysely } from 'kysely';
import { HydratedDocumentBaseline, StoredOperation } from '../../types.js';
import { BaselineStorage } from '../Storage.js';
import { Database, DocumentBaselineRow } from './tables.js';

export class SqlBaselines implements BaselineStorage {
	constructor(
		private db: Kysely<Database>,
		private libraryId: string,
		private dialect: 'postgres' | 'sqlite',
	) {}

	get = async (
		oid: string,
		{ tx }: { tx?: Kysely<Database> } = {},
	): Promise<HydratedDocumentBaseline | null> => {
		const db = tx ?? this.db;
		const raw =
			(await db
				.selectFrom('DocumentBaseline')
				.where('oid', '=', oid)
				.selectAll()
				.executeTakeFirst()) ?? null;
		if (!raw) return null;
		this.hydrate(raw);
		return raw as any;
	};

	getAll = async () => {
		const db = this.db;
		const raw = await db
			.selectFrom('DocumentBaseline')
			.orderBy('timestamp', 'asc')
			.selectAll()
			.execute();

		raw.forEach(this.hydrate);

		return raw as any;
	};

	set = async (
		baseline: DocumentBaseline,
		{
			tx,
		}: {
			tx?: Kysely<Database>;
		},
	) => {
		const db = tx ?? this.db;
		if (!baseline.snapshot) {
			await db
				.deleteFrom('DocumentBaseline')
				.where('oid', '=', baseline.oid)
				.execute();
			return;
		}

		await db
			.insertInto('DocumentBaseline')
			.values({
				oid: baseline.oid,
				snapshot: JSON.stringify(baseline.snapshot),
				timestamp: baseline.timestamp,
				authz: baseline.authz,
			})
			.onConflict((cb) =>
				cb.doUpdateSet({
					snapshot: JSON.stringify(baseline.snapshot),
					timestamp: baseline.timestamp,
					authz: baseline.authz,
				}),
			)
			.execute();
	};

	insertAll = async (baselines: DocumentBaseline[]) => {
		const db = this.db;
		await db.transaction().execute(async (tx) => {
			for (const baseline of baselines) {
				await this.set(baseline, { tx });
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

		await db.transaction().execute(async (tx) => {
			let baseline = await this.get(oid, { tx });
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
			await this.set(baseline, { tx });
		});
	};

	deleteAll = async () => {
		const db = this.db;
		await db.deleteFrom('DocumentBaseline').execute();
	};

	getCount = async () => {
		const db = this.db;
		return (
			(
				await db
					.selectFrom('DocumentBaseline')
					.select(({ fn }) => fn.countAll<number>().as('count'))
					.executeTakeFirst()
			)?.count ?? 0
		);
	};
}
