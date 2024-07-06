import { Kysely } from 'kysely';
import { BaselineStorage } from '../Storage.js';
import { Database, DocumentBaselineRow } from './tables.js';
import { DocumentBaseline, Ref, applyPatch } from '@verdant-web/common';
import { HydratedDocumentBaseline, StoredOperation } from '../../types.js';
import { Databases } from './Databases.js';

export class SqlBaselines implements BaselineStorage {
	constructor(
		private dbs: Databases,
		private dialect: 'postgres' | 'sqlite',
	) {}

	get = async (
		libraryId: string,
		oid: string,
		{ tx }: { tx?: Kysely<Database> } = {},
	): Promise<HydratedDocumentBaseline | null> => {
		const db = tx ?? (await this.dbs.get(libraryId));
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

	getAll = async (libraryId: string) => {
		const db = await this.dbs.get(libraryId);
		const raw = await db
			.selectFrom('DocumentBaseline')
			.orderBy('timestamp', 'asc')
			.selectAll()
			.execute();

		raw.forEach(this.hydrate);

		return raw as any;
	};

	set = async (
		libraryId: string,
		baseline: DocumentBaseline,
		{
			tx,
		}: {
			tx?: Kysely<Database>;
		},
	) => {
		const db = tx ?? (await this.dbs.get(libraryId));
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

	insertAll = async (libraryId: string, baselines: DocumentBaseline[]) => {
		const db = await this.dbs.get(libraryId);
		await db.transaction().execute(async (tx) => {
			for (const baseline of baselines) {
				await this.set(libraryId, baseline, { tx });
			}
		});
	};

	private hydrate = (row: DocumentBaselineRow) => {
		// avoiding extra allocation from .map by type-asserting here
		row.snapshot = JSON.parse(row.snapshot);
	};

	applyOperations = async (
		libraryId: string,
		oid: string,
		operations: StoredOperation[],
		deletedRefs?: Ref[],
	) => {
		if (operations.length === 0) return;

		const db = await this.dbs.get(libraryId);

		await db.transaction().execute(async (tx) => {
			let baseline = await this.get(libraryId, oid, { tx });
			if (!baseline) {
				baseline = {
					oid,
					snapshot: {},
					timestamp: operations[0].timestamp,
					libraryId,
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
			await this.set(libraryId, baseline, { tx });
		});
	};

	deleteAll = async (libraryId: string) => {
		const db = await this.dbs.get(libraryId);
		await db.deleteFrom('DocumentBaseline').execute();
	};

	getCount = async (libraryId: string) => {
		const db = await this.dbs.get(libraryId);
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
