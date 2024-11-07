import { EventSubscriber, getOidRoot, VerdantError } from '@verdant-web/common';
import { Context, InitialContext } from '../context/context.js';
import { getWipNamespace } from '../utils/wip.js';
import { ExportedData } from './interfaces.js';
import { PersistenceFiles } from './PersistenceFiles.js';
import { PersistenceMetadata } from './PersistenceMetadata.js';
import { PersistenceDocuments } from './PersistenceQueries.js';
import { migrate } from './migration/migrate.js';
import { ShutdownHandler } from '../context/ShutdownHandler.js';

export async function initializePersistence(
	ctx: InitialContext,
): Promise<Context> {
	let context = ctx as any as Context;
	if (ctx.schema.wip) {
		// this is a WIP database, so we need to create a new namespace for the WIP data.
		context.namespace = getWipNamespace(ctx.originalNamespace, ctx.schema);
		context.log('info', 'Switched to WIP namespace', context.namespace);
		// check if this WIP database is already in use
		const namespaces = await context.persistence.getNamespaces();

		if (!namespaces.includes(context.namespace)) {
			// copy all data to WIP namespace -- from the current version of local
			// data, not the WIP schema version. this may not be n-1, we might
			// be loading a WIP schema over older data.
			const currentVersion = await context.persistence.getNamespaceVersion(
				context.originalNamespace,
			);

			if (currentVersion === 0) {
				// there is no existing data. nothing to copy.
				context.log('debug', 'No existing data to copy to WIP namespace');
			} else {
				const currentSchema = ctx.oldSchemas?.find(
					(s) => s.version === currentVersion,
				);
				if (!currentSchema) {
					throw new VerdantError(
						VerdantError.Code.MigrationPathNotFound,
						undefined,
						`Trying to open WIP database for version ${ctx.schema.version}, but the current local data is version ${currentVersion} and a historical schema for that version is not available.`,
					);
				}
				context.log(
					'info',
					`Copying data from ${context.originalNamespace} to ${context.namespace}`,
				);
				await context.persistence.copyNamespace(
					context.originalNamespace,
					context.namespace,
					// needs to be the original schema; the copy should be of the original
					// data and schema structure; the WIP schema migration application happens
					// below.
					{
						...context,
						schema: currentSchema,
					},
				);
			}
		}
	}

	const namespace = await ctx.persistence.openNamespace(
		context.namespace,
		context,
	);

	context.log('info', 'Opening persistence metadata');
	context.meta = new PersistenceMetadata(
		await namespace.openMetadata(ctx),
		ctx,
	);

	context.log('info', 'Opening persistence files');
	context.files = new PersistenceFiles(
		await namespace.openFiles(context),
		context,
	);

	context.log('info', 'Migrating document database');
	await migrate({
		context,
		version: ctx.schema.version,
	});

	context.log('info', 'Opening persistence documents');
	context.documents = new PersistenceDocuments(
		await namespace.openDocuments(context),
		context,
	);

	if (!ctx.schema.wip) {
		const namespaces = await ctx.persistence.getNamespaces();
		// cleanup old WIP databases
		for (const namespace of namespaces) {
			if (namespace.startsWith(`@@wip_`)) {
				ctx.log('debug', 'Cleaning up old WIP namespace', namespace);
				await ctx.persistence.deleteNamespace(namespace, ctx);
			}
		}
	}

	return context;
}

export async function importPersistence(
	ctx: Context,
	exportedData: ExportedData,
): Promise<void> {
	ctx.log('info', 'Importing data from export');
	// open persistence at the version of the import
	const exportedSchema = ctx.oldSchemas?.find(
		(s) => s.version === exportedData.data.schemaVersion,
	);
	if (!exportedSchema) {
		// this means the user hasn't upgraded their CLI/client to include old schemas, or
		// this exported data comes from a version which has since been shortcut.
		throw new Error(
			`Could not find schema for version ${exportedData.data.schemaVersion}`,
		);
	}

	// using a new namespace to put all of this into a temporary zone
	const importedNamespace = `@@import_${Date.now()}`;

	const importedContext = await initializePersistence({
		...ctx,
		schema: exportedSchema,
		namespace: importedNamespace,
		originalNamespace: importedNamespace,
		// no-op entity events -- don't need to inform queries of changes.
		entityEvents: new EventSubscriber(),
		config: {
			...ctx.config,
			persistence: {
				...ctx.config.persistence,
				disableRebasing: true,
			},
		},
		persistenceShutdownHandler: new ShutdownHandler(),
	});
	// load imported data into persistence
	await importedContext.meta.resetFrom(exportedData.data);
	// need to write indexes here!
	const affectedOids = new Set<string>();
	for (const baseline of exportedData.data.baselines) {
		affectedOids.add(getOidRoot(baseline.oid));
	}
	for (const operation of exportedData.data.operations) {
		affectedOids.add(getOidRoot(operation.oid));
	}
	const toSave = await Promise.all(
		Array.from(affectedOids).map(async (oid) => {
			const snapshot = await importedContext.meta.getDocumentSnapshot(oid);
			return {
				oid,
				getSnapshot: () => snapshot,
			};
		}),
	);
	await importedContext.documents.saveEntities(toSave);
	await importedContext.files.import(exportedData);

	ctx.log('debug', 'Imported data into temporary namespace', importedNamespace);

	// shut down the imported databases
	await importedContext.persistenceShutdownHandler.shutdown();

	if (exportedSchema.version !== ctx.schema.version) {
		// an upgrade of the imported data is needed ; it's an older version
		// of the schema.

		// upgrade the imported data to the latest schema
		const currentSchema = ctx.schema;
		const upgradedContext = await initializePersistence({
			...importedContext,
			persistenceShutdownHandler: new ShutdownHandler(),
			schema: currentSchema,
		});

		ctx.log('debug', 'Upgraded imported data to current schema');

		await upgradedContext.persistenceShutdownHandler.shutdown();

		ctx.log('debug', 'Shut down upgraded databases');
	}

	// shut down the persistence layer
	await ctx.persistenceShutdownHandler.shutdown();

	// copy the imported data into the current namespace
	await ctx.persistence.copyNamespace(importedNamespace, ctx.namespace, ctx);

	// restart the persistence layer
	await initializePersistence(ctx);

	// verify integrity -- this can only be done if imported data was same
	// version as current schema, because migrations could add or remove
	// operations. still, it's a good sanity check.
	if (exportedData.data.schemaVersion === ctx.schema.version) {
		const stats = await ctx.meta.stats();
		if (stats.operationsSize.count !== exportedData.data.operations.length) {
			ctx.log(
				'critical',
				'Imported operations count mismatch',
				'expected',
				exportedData.data.operations.length,
				'actual',
				stats.operationsSize.count,
			);
			throw new VerdantError(
				VerdantError.Code.ImportFailed,
				undefined,
				'Imported operations count mismatch',
			);
		}
		if (stats.baselinesSize.count !== exportedData.data.baselines.length) {
			ctx.log(
				'critical',
				'Imported documents count mismatch',
				'expected',
				exportedData.data.baselines.length,
				'actual',
				stats.baselinesSize.count,
			);
			throw new VerdantError(
				VerdantError.Code.ImportFailed,
				undefined,
				'Imported documents count mismatch',
			);
		}
	}

	ctx.log('debug', 'Data copied to primary namespace');

	// cleanup the imported namespace
	await ctx.persistence.deleteNamespace(importedNamespace, ctx);

	ctx.log('debug', 'Deleted temporary namespace');

	ctx.internalEvents.emit('persistenceReset');
	ctx.log('info', 'Data imported successfully');

	// reset to allow future shutdowns.
	ctx.persistenceShutdownHandler.reset();
}
