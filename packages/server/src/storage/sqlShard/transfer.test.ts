import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openDatabase as openUnifiedDatabase } from '../sql/database.js';
import {
	randomBaselines,
	randomFileMetadata,
	randomOperations,
	randomReplicaInfo,
} from './_testData/unifiedData.js';
import { join, dirname } from 'path';
import { transferToShards } from './transfer.js';
import { rm, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import {
	DocumentBaselineRow,
	FileMetadataRow,
	OperationHistoryRow,
	ReplicaInfoRow,
} from '../sql/tables.js';
import { Kysely } from 'kysely';

const testTempDir = join(
	dirname(fileURLToPath(import.meta.url)),
	'_testData',
	'tmp',
);

describe('sql-shard storage transfer utility', () => {
	const databases = new Array<Kysely<any>>();
	beforeAll(async () => {
		try {
			await rm(testTempDir, { recursive: true });
		} catch (err) {}
		// create a temp dir
		await mkdir(testTempDir, { recursive: true });
	});
	afterAll(async () => {
		try {
			await Promise.all(databases.map((db) => db.destroy()));
			// empty the temp dir
			await rm(testTempDir, { recursive: true });
		} catch (err) {
			// what can you do...
			console.error(err);
		}
	});

	it('should transfer data from unified database to shards', async () => {
		const unifiedFile = join(testTempDir, 'unified.sqlite');
		const { db: unifiedDb, ready } = openUnifiedDatabase(unifiedFile);
		databases.push(unifiedDb);
		await ready;
		const libraryIds = ['library-1', 'library-2', 'library-3'];
		const randomData = {} as Record<
			string,
			{
				operations: OperationHistoryRow[];
				baselines: DocumentBaselineRow[];
				replicas: ReplicaInfoRow[];
				fileMetadata: FileMetadataRow[];
			}
		>;
		for (const libraryId of libraryIds) {
			randomData[libraryId] = {
				// test a lot of them - more than max sqlite var count.
				// only doing operations here to reduce test time.
				operations: randomOperations(libraryId, 6000),
				baselines: randomBaselines(libraryId),
				replicas: randomReplicaInfo(libraryId),
				fileMetadata: randomFileMetadata(libraryId),
			};

			// have to batch these...
			for (let i = 0; i < randomData[libraryId].operations.length; i += 1000) {
				const toInsert = randomData[libraryId].operations.slice(i, i + 1000);
				await unifiedDb
					.insertInto('OperationHistory')
					.values(toInsert)
					.execute();
			}
			for (let i = 0; i < randomData[libraryId].baselines.length; i += 1000) {
				const toInsert = randomData[libraryId].baselines.slice(i, i + 1000);
				await unifiedDb
					.insertInto('DocumentBaseline')
					.values(toInsert)
					.execute();
			}
			for (
				let i = 0;
				i < randomData[libraryId].fileMetadata.length;
				i += 1000
			) {
				const toInsert = randomData[libraryId].fileMetadata.slice(i, i + 1000);
				await unifiedDb.insertInto('FileMetadata').values(toInsert).execute();
			}
			for (let i = 0; i < randomData[libraryId].replicas.length; i += 1000) {
				const toInsert = randomData[libraryId].replicas.slice(i, i + 1000);
				await unifiedDb.insertInto('ReplicaInfo').values(toInsert).execute();
			}
		}

		const shards = await transferToShards({
			directory: testTempDir,
			file: unifiedFile,
		});
		Object.values(shards).map((db) => databases.push(db));

		expect(Object.keys(shards).sort()).toEqual(libraryIds.sort());

		for (const [libraryId, db] of Object.entries(shards)) {
			const operations = await db
				.selectFrom('OperationHistory')
				.selectAll()
				.execute();
			const baselines = await db
				.selectFrom('DocumentBaseline')
				.selectAll()
				.execute();
			const replicas = await db.selectFrom('ReplicaInfo').selectAll().execute();
			const fileMetadata = await db
				.selectFrom('FileMetadata')
				.selectAll()
				.execute();

			expect(operations.length).toBe(randomData[libraryId].operations.length);
			expect(baselines.length).toBe(randomData[libraryId].baselines.length);
			expect(replicas.length).toBe(randomData[libraryId].replicas.length);
			expect(fileMetadata.length).toBe(
				randomData[libraryId].fileMetadata.length,
			);

			for (const { oid } of randomData[libraryId].operations) {
				expect(operations.find((op) => op.oid === oid)).toBeDefined();
			}
			for (const { oid } of randomData[libraryId].baselines) {
				expect(
					baselines.find((baseline) => baseline.oid === oid),
				).toBeDefined();
			}
			for (const { id } of randomData[libraryId].replicas) {
				expect(replicas.find((replica) => replica.id === id)).toBeDefined();
			}
			for (const { fileId } of randomData[libraryId].fileMetadata) {
				expect(
					fileMetadata.find((file) => file.fileId === fileId),
				).toBeDefined();
			}
		}
	});
});
