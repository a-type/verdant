import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import create from 'better-sqlite3';
import { migrations } from './migrations.js';
import fs from 'fs';

describe('the v5->v6 migration', () => {
	let dbFile: string;
	let db: create.Database;
	beforeAll(() => {
		dbFile = `v5-migration-test-${Math.random()}.sqlite`;
		db = create(dbFile);
	});
	afterAll(() => {
		db.close();
		fs.rmSync(dbFile);
	});

	it('rewrites legacy oids in all ops and baselines', () => {
		// manually migrate to v4 before starting and seed the database with some
		// operations and baselines.
		migrations(db, 5);
		// manually insert some operations and baselines
		db.transaction(() => {
			[
				{
					libraryId: 'test-1',
					replicaId: 'foo',
					oid: 'weirds/b',
					data: {
						op: 'set',
						value: { '@@type': 'ref', id: 'weirds/b.objectMap.one:ghi' },
					},
					timestamp: '1',
					serverOrder: 1,
				},
				{
					libraryId: 'test-1',
					replicaId: 'foo',
					oid: 'weirds/b.list:ghi',
					data: {
						op: 'list-push',
						value: { '@@type': 'ref', id: 'weirds/b.list.#:abc' },
					},
					timestamp: '1',
					serverOrder: 2,
				},
				{
					libraryId: 'test-1',
					replicaId: 'foo',
					oid: 'weirds/b.list:ghi',
					data: {
						op: 'list-remove',
						value: { '@@type': 'ref', id: 'weirds/b.list.#:abc' },
					},
					timestamp: '2',
					serverOrder: 3,
				},
				{
					libraryId: 'test-2',
					replicaId: 'bar',
					oid: 'weirds/b',
					data: {
						op: 'set',
						value: { '@@type': 'ref', id: 'weirds/b.objectMap.one:ghi' },
					},
					timestamp: '1a',
					serverOrder: 1,
				},
			].forEach(
				({ libraryId, replicaId, oid, data, timestamp, serverOrder }) => {
					db.prepare(
						/* sql */ `
        INSERT INTO OperationHistory (libraryId, replicaId, oid, data, timestamp, serverOrder)
        VALUES (?, ?, ?, ?, ?, ?);
      `,
					).run(
						libraryId,
						replicaId,
						oid,
						JSON.stringify(data),
						timestamp,
						serverOrder,
					);
				},
			);
			[
				{
					libraryId: 'test-1',
					oid: 'weirds/b.objectMap.one:ghi',
					snapshot: { '@@type': 'ref', id: 'weirds/b.list.#:abc' },
					timestamp: '1',
				},
				{
					libraryId: 'test-2',
					oid: 'weirds/b.objectMap.one:ghi',
					snapshot: { '@@type': 'ref', id: 'weirds/b.list.#:abc' },
					timestamp: '1a',
				},
			].forEach(({ libraryId, oid, snapshot, timestamp }) => {
				db.prepare(
					/* sql */ `
        INSERT INTO DocumentBaseline (libraryId, oid, snapshot, timestamp)
        VALUES (?, ?, ?, ?);
      `,
				).run(libraryId, oid, JSON.stringify(snapshot), timestamp);
			});
		})();

		migrations(db);

		// check that the operations and baselines have been rewritten
		db.transaction(() => {
			const operations = db
				.prepare(
					/* sql */ `
      SELECT * from OperationHistory;
    `,
				)
				.all();
			expect(operations).toMatchSnapshot();
			const baselines = db
				.prepare(
					/* sql */ `
      SELECT * from DocumentBaseline;
    `,
				)
				.all();
			expect(baselines).toMatchSnapshot();
		})();

		db.close();
	});
});
