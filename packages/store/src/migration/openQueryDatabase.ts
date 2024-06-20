import { Migration } from '@verdant-web/common';
import { Metadata } from '../metadata/Metadata.js';
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
	meta,
	context,
}: {
	version: number;
	migrations: Migration<any>[];
	indexedDB?: IDBFactory;
	meta: Metadata;
	context: OpenDocumentDbContext;
}) {
	if (context.schema.wip) {
		throw new Error('Cannot open a production client with a WIP schema!');
	}

	const currentVersion = await getDatabaseVersion(
		indexedDB,
		context.namespace,
		version,
		context.log,
	);

	context.log(
		'debug',
		'Current database version:',
		currentVersion,
		'target version:',
		version,
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
		await runMigrations({ context, toRun, meta, indexedDB });
	}
	return openDatabase({
		indexedDB,
		namespace: context.namespace,
		version,
		context,
	});
}
