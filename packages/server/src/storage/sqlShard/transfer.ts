import { Kysely } from 'kysely';
import { openDatabase as openUnifiedDatabase } from '../sql/database.js';
import { Database as UnifiedDatabase } from '../sql/tables.js';
import { Database } from './tables.js';
import { openDatabase } from './database.js';

const DEFAULT_BATCH_SIZE = 1000;

export async function transferToShards({
	file,
	directory,
	batchSize = DEFAULT_BATCH_SIZE,
}: {
	file: string;
	directory: string;
	batchSize?: number;
}) {
	console.info(
		`Transferring from unified database (${file}) to shards (${directory})...`,
	);
	const { db: unifiedDb, ready } = openUnifiedDatabase(file);
	await ready;
	const libraries = await unifiedDb
		.selectFrom('ReplicaInfo')
		.select('ReplicaInfo.libraryId')
		.distinct()
		.execute();

	const dbs = await Promise.all(
		libraries.map(async ({ libraryId }) => {
			const db = await openDatabase(directory, libraryId);
			await copyLibrary(libraryId, unifiedDb, db, batchSize);
			return db;
		}),
	);

	return libraries.reduce(
		(acc, { libraryId }, i) => {
			acc[libraryId] = dbs[i];
			return acc;
		},
		{} as Record<string, Kysely<Database>>,
	);
}

async function copyLibrary(
	libraryId: string,
	source: Kysely<UnifiedDatabase>,
	dest: Kysely<Database>,
	batchSize: number,
) {
	const operations = await source
		.selectFrom('OperationHistory')
		.where('libraryId', '=', libraryId)
		.selectAll()
		.execute();
	const baselines = await source
		.selectFrom('DocumentBaseline')
		.where('libraryId', '=', libraryId)
		.selectAll()
		.execute();
	const replicas = await source
		.selectFrom('ReplicaInfo')
		.where('libraryId', '=', libraryId)
		.selectAll()
		.execute();
	const fileMetadata = await source
		.selectFrom('FileMetadata')
		.where('libraryId', '=', libraryId)
		.selectAll()
		.execute();

	for (const operation of operations) {
		// @ts-expect-error
		delete operation.libraryId;
	}
	for (const baseline of baselines) {
		// @ts-expect-error
		delete baseline.libraryId;
	}
	for (const replica of replicas) {
		// @ts-expect-error
		delete replica.libraryId;
	}
	for (const metadata of fileMetadata) {
		// @ts-expect-error
		delete metadata.libraryId;
	}

	await dest.transaction().execute(async (trx) => {
		const actions: Promise<any>[] = [];
		// batch insert data to avoid maximum vars limits
		if (operations.length) {
			for (let i = 0; i < operations.length; i += batchSize) {
				const toInsert = operations.slice(i, i + batchSize);
				actions.push(
					trx.insertInto('OperationHistory').values(toInsert).execute(),
				);
			}
		}
		if (baselines.length) {
			for (let i = 0; i < baselines.length; i += batchSize) {
				const toInsert = baselines.slice(i, i + batchSize);
				actions.push(
					trx.insertInto('DocumentBaseline').values(toInsert).execute(),
				);
			}
		}
		if (replicas.length) {
			for (let i = 0; i < replicas.length; i += batchSize) {
				const toInsert = replicas.slice(i, i + batchSize);
				actions.push(trx.insertInto('ReplicaInfo').values(toInsert).execute());
			}
		}
		if (fileMetadata.length) {
			for (let i = 0; i < fileMetadata.length; i += batchSize) {
				const toInsert = fileMetadata.slice(i, i + batchSize);
				actions.push(trx.insertInto('FileMetadata').values(toInsert).execute());
			}
		}
		await Promise.all(actions);
	});
}
