import { Kysely } from 'kysely';
import { openDatabase as openUnifiedDatabase } from '../sql/database.js';
import { Database as UnifiedDatabase } from '../sql/tables.js';
import { Database } from './tables.js';
import { openDatabase } from './database.js';

export async function transferToShards({
	file,
	directory,
}: {
	file: string;
	directory: string;
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
			await copyLibrary(libraryId, unifiedDb, db);
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
		if (operations.length) {
			actions.push(
				trx.insertInto('OperationHistory').values(operations).execute(),
			);
		}
		if (baselines.length) {
			actions.push(
				trx.insertInto('DocumentBaseline').values(baselines).execute(),
			);
		}
		if (replicas.length) {
			actions.push(trx.insertInto('ReplicaInfo').values(replicas).execute());
		}
		if (fileMetadata.length) {
			actions.push(
				trx.insertInto('FileMetadata').values(fileMetadata).execute(),
			);
		}
		await Promise.all(actions);
	});
}
