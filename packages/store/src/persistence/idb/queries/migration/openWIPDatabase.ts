import { Migration } from '@verdant-web/common';
import { Metadata } from '../metadata/Metadata.js';
import { copyAll, getDatabaseVersion, openDatabase } from './db.js';
import { runMigrations } from './migrations.js';
import { getMigrationPath } from './paths.js';
import { OpenDocumentDbContext } from './types.js';

const globalIDB =
	typeof window !== 'undefined' ? window.indexedDB : (undefined as any);

export async function openWIPDatabase({
	version,
	indexedDB = globalIDB,
	migrations,
	meta,
	context,
	wipNamespace,
}: {
	version: number;
	migrations: Migration<any>[];
	indexedDB?: IDBFactory;
	meta: Metadata;
	context: OpenDocumentDbContext;
	wipNamespace: string;
}) {
	context.log('debug', 'Opening WIP database', wipNamespace);
	const currentWIPVersion = await getDatabaseVersion(
		indexedDB,
		wipNamespace,
		version,
		context.log,
	);

	if (currentWIPVersion === version) {
		context.log('info', `WIP schema is up-to-date; not refreshing database`);
	} else {
		context.log('info', `WIP schema is out-of-date; refreshing database`);

		// first we need to copy the data from the production database to the WIP database
		// at the current (non-wip) version.

		const initialToRun = getMigrationPath({
			currentVersion: currentWIPVersion,
			targetVersion: version - 1,
			migrations,
		});

		if (initialToRun.length > 0) {
			await runMigrations({
				context,
				toRun: initialToRun,
				meta,
				indexedDB,
				namespace: wipNamespace,
			});

			// now, we copy the data from the main database.
			const mainDatabase = await openDatabase({
				indexedDB,
				namespace: context.namespace,
				version: version - 1,
				context,
			});

			const wipDatabase = await openDatabase({
				indexedDB,
				namespace: wipNamespace,
				version: version - 1,
				context,
			});
			await copyAll(mainDatabase, wipDatabase);
		}

		const toRun = getMigrationPath({
			currentVersion: version - 1,
			targetVersion: version,
			migrations,
		});

		if (toRun.length > 0) {
			await runMigrations({
				context,
				toRun,
				meta,
				indexedDB,
				namespace: wipNamespace,
			});
		}
	}

	return openDatabase({
		indexedDB,
		namespace: wipNamespace,
		version,
		context,
	});
}
