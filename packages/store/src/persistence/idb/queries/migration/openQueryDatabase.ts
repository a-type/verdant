import { Migration } from '@verdant-web/common';
import { getDatabaseVersion, openDatabase } from './db.js';
import { runMigrations } from './migrations.js';
import { getMigrationPath } from './paths.js';
import { OpenDocumentDbContext } from './types.js';

const globalIDB =
	typeof window !== 'undefined' ? window.indexedDB : (undefined as any);

export async function openQueryDatabase({
	version,
	indexedDB = globalIDB,
	migrations,
	context,
}: {
	version: number;
	migrations: Migration<any>[];
	indexedDB?: IDBFactory;
	context: OpenDocumentDbContext;
}) {
	const currentVersion = await getDatabaseVersion(indexedDB, context.namespace);

	context.log(
		'debug',
		'Opening index database',
		context.namespace,
		'Current database version:',
		currentVersion,
		'target version:',
		version,
		context.schema.wip ? '(wip)' : '',
	);

	const toRun = getMigrationPath({
		currentVersion,
		targetVersion: version,
		migrations,
	});

	if (toRun.length > 0) {
		context.log(
			'debug',
			'Migrations to run:',
			toRun.map((m) => m.version),
		);
		await runMigrations({ context, toRun, indexedDB });
	}
	return openDatabase({
		indexedDB,
		namespace: context.namespace,
		version,
		context,
	});
}
