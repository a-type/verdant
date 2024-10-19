import { Context, InitialContext } from '../context/context.js';
import { getWipNamespace } from '../utils/wip.js';
import { ExportedData } from './interfaces.js';
import { PersistenceFiles } from './PersistenceFiles.js';
import { PersistenceMetadata } from './PersistenceMetadata.js';
import { PersistenceQueries } from './PersistenceQueries.js';

export async function initializePersistence(
	ctx: InitialContext,
): Promise<Context> {
	let context = ctx as any as Context;
	if (ctx.schema.wip) {
		ctx.namespace = getWipNamespace(ctx.originalNamespace, ctx.schema);
		// check if this WIP database is already in use
		const namespaces = await ctx.persistence.getNamespaces();

		if (!namespaces.includes(ctx.namespace)) {
			// copy all data to WIP namespace
			await ctx.persistence.copyNamespace(
				ctx.originalNamespace,
				ctx.namespace,
				ctx,
			);
		}
	}

	context.meta = new PersistenceMetadata(
		await ctx.persistence.openMetadata(ctx),
		ctx,
	);

	context.files = new PersistenceFiles(
		await ctx.persistence.openFiles(context),
		context,
	);

	context.queries = new PersistenceQueries(
		await ctx.persistence.openQueries(context),
		context,
	);

	if (!ctx.schema.wip) {
		const namespaces = await ctx.persistence.getNamespaces();
		// cleanup old WIP databases
		for (const namespace of namespaces) {
			if (namespace.startsWith(`@@wip_`)) {
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
	});
	// load imported data into persistence
	await importedContext.meta.resetFrom(exportedData.data);
	await importedContext.files.import(exportedData);

	ctx.log('debug', 'Imported data into temporary namespace', importedNamespace);

	// shut down the imported databases
	await importedContext.queries.dispose();
	await importedContext.meta.dispose();
	await importedContext.files.dispose();

	if (exportedSchema.version !== ctx.schema.version) {
		// an upgrade of the imported data is needed ; it's an older version
		// of the schema.
		ctx.log('debug', 'Shut down imported databases');

		// upgrade the imported data to the latest schema
		const currentSchema = ctx.schema;
		const upgradedContext = await initializePersistence({
			...importedContext,
			schema: currentSchema,
		});

		ctx.log('debug', 'Upgraded imported data to current schema');

		await upgradedContext.queries.dispose();
		await upgradedContext.meta.dispose();
		await upgradedContext.files.dispose();

		ctx.log('debug', 'Shut down upgraded databases');
	}

	// copy the imported data into the current namespace
	await ctx.persistence.copyNamespace(importedNamespace, ctx.namespace, ctx);

	// verify integrity
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
	}

	ctx.log('debug', 'Data copied to primary namespace');

	ctx.internalEvents.emit('persistenceReset');

	// cleanup the imported namespace
	await ctx.persistence.deleteNamespace(importedNamespace, ctx);

	ctx.log('debug', 'Deleted temporary namespace');

	ctx.log('info', 'Data imported successfully');
}
