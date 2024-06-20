import { getTimestampSchemaVersion } from '@verdant-web/common';
import { Context } from '../context.js';
import { EntityStore, IncomingData } from '../entities/EntityStore.js';
import { ExportData, Metadata } from '../metadata/Metadata.js';
import { applySchemaToDatabase } from './migrations.js';
import { globalIDB } from '../idb.js';

/**
 * Resets the client to an exported dataset.
 * This clears all local data.
 */
export async function importAndReset({
	data,
	context,
	meta,
	entities,
	indexedDB = globalIDB,
}: {
	data: ExportData;
	context: Context;
	meta: Metadata;
	entities: EntityStore;
	indexedDB?: IDBFactory;
}) {
	const initialMigration = context.migrations.find(
		(m) => m.newSchema.version === data.schema.version,
	);
	if (!initialMigration) {
		throw new Error(
			`Import error: migration not found for initial version ${data.schema.version}. Cannot import data. Contact the developer of this app to request a fix.`,
		);
	}

	// TODO: copy queryable storage to a backup
	// before proceeding

	// this only cleans out metadata and initializes
	// schema and local replica
	await meta.resetFrom(data);
	// drops all entities
	await entities.empty();

	// we need to open a queryable database with the
	// schema version of the incoming data
	const transitionDb = await applySchemaToDatabase({
		migration: initialMigration,
		indexedDB,
		namespace: context.namespace,
		context,
	});

	// replace the queryable database and schema -
	// we're going back in time, basically.
	context.schema = data.schema;
	context.documentDb = transitionDb;
	context.internalEvents.emit('documentDbChanged', transitionDb);

	// apply the data to the transition database
	await entities.addData(data);

	// copy the data from the transition database to the main database

	// TODO: the rest...
}

/**
 * Resets the client to data from the server.
 * This clears all local data.
 */
export async function resetToServerData({
	data,
	context,
	meta,
	...rest
}: {
	data: IncomingData;
	context: Context;
	meta: Metadata;
	entities: EntityStore;
	indexedDB?: IDBFactory;
}) {
	if (!context.oldSchemas) {
		throw new Error(
			'Cannot import data without old schemas. The developer of this app must update the app to support this feature.',
		);
	}
	const localReplica = await meta.localReplica.get();
	const dataVersion = maximumVersion(data);
	const dataSchema = context.oldSchemas.find((s) => s.version === dataVersion);
	if (!dataSchema) {
		throw new Error(
			`Cannot import data with version ${dataVersion} (schema not found). The developer of this app must update the app to support this feature.`,
		);
	}
	// create exportData out of server data
	const exportData: ExportData = {
		baselines: data.baselines ?? [],
		operations: data.operations ?? [],
		localReplica,
		schema: dataSchema,
	};

	return importAndReset({
		data: exportData,
		context,
		meta,
		...rest,
	});
}

function maximumVersion(data: IncomingData) {
	return Math.max(
		0,
		...(data.operations ?? []).map((op) =>
			getTimestampSchemaVersion(op.timestamp),
		),
		...(data.baselines ?? []).map((baseline) =>
			getTimestampSchemaVersion(baseline.timestamp),
		),
	);
}
