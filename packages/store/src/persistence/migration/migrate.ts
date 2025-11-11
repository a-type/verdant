import { Migration } from '@verdant-web/common';
import { ContextWithoutPersistence } from '../../context/context.js';
import { ShutdownHandler } from '../../context/ShutdownHandler.js';
import { PersistenceNamespace } from '../interfaces.js';
import { PersistenceMetadata } from '../PersistenceMetadata.js';
import { getMigrationEngine } from './engine.js';
import { finalizeMigration } from './finalize.js';
import { getMigrationPath } from './paths.js';

export async function migrate({
	context,
	version,
	meta,
}: {
	context: ContextWithoutPersistence;
	meta: PersistenceMetadata;
	version: number;
}) {
	const ns = await context.persistence.openNamespace(
		context.namespace,
		context,
	);
	await acquireLock(context.namespace, async () => {
		const currentVersion = await context.persistence.getNamespaceVersion(
			context.namespace,
		);

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
			migrations: context.migrations,
		});

		if (toRun.length > 0) {
			context.log(
				'debug',
				'Migrations to run:',
				toRun.map((m) => m.version),
			);
			await runMigrations({ context, ns, toRun, meta });
		}
	});
}

async function acquireLock(namespace: string, procedure: () => Promise<void>) {
	if (typeof navigator !== 'undefined' && navigator.locks) {
		await navigator.locks.request(`verdant_migration_${namespace}`, procedure);
	} else {
		// TODO: is there a fallback?
		await procedure();
	}
}

export async function runMigrations({
	context,
	toRun,
	ns,
	meta,
}: {
	context: ContextWithoutPersistence;
	toRun: Migration<any>[];
	ns: PersistenceNamespace;
	meta: PersistenceMetadata;
}) {
	// disable rebasing for the duration of migrations
	context.pauseRebasing = true;
	// now the fun part
	for (const migration of toRun) {
		context.log(
			'info',
			`🚀 Running migration v${migration.oldSchema.version} -> v${migration.newSchema.version}`,
		);
		const migrationContext = context.cloneWithOptions({
			schema: migration.oldSchema,
			persistenceShutdownHandler: new ShutdownHandler(context.log),
		});
		// this will only write to our metadata store via operations!
		const engine = await getMigrationEngine({
			migration,
			context: migrationContext,
			ns,
			meta,
		});
		try {
			context.log(
				'debug',
				'Migrating data',
				migrationContext.namespace,
				'from version',
				migration.oldSchema.version,
				'to version',
				migration.newSchema.version,
			);
			await migration.migrate(engine);
			context.log('debug', 'Awaiting remaining migration tasks');
			// wait on any out-of-band async operations to complete
			await Promise.all(engine.awaitables);
		} catch (err) {
			context.log(
				'critical',
				`Migration failed (${migration.oldSchema.version} -> ${migration.newSchema.version})`,
				err,
			);
			if (err instanceof Error) {
				throw err;
			} else {
				throw new Error('Unknown error during migration');
			}
		}

		await engine.close();

		migrationContext.log(
			'debug',
			'Upgrading database',
			migrationContext.namespace,
			'from version',
			migrationContext.schema.version,
			'to version',
			migration.newSchema.version,
		);

		await ns.applyMigration(migrationContext, migration);

		// switch to the new schema
		migrationContext.schema = migration.newSchema;
		const upgradedDocuments = await ns.openDocuments(migrationContext);

		await finalizeMigration({
			ctx: migrationContext,
			migration,
			engine,
			documents: upgradedDocuments,
			meta,
		});
		await upgradedDocuments.close();

		migrationContext.log(
			'debug',
			`Migration of ${migrationContext.namespace} complete.`,
		);
		migrationContext.log(
			'info',
			`
				⬆️ v${migration.newSchema.version} Migration complete. Here's the rundown:
					- Added collections: ${migration.addedCollections.join(', ')}
					- Removed collections: ${migration.removedCollections.join(', ')}
					- Changed collections: ${migration.changedCollections.join(', ')}
					- New indexes: ${Object.keys(migration.addedIndexes)
						.map((col) =>
							migration.addedIndexes[col].map((i) => `${col}.${i.name}`),
						)
						.flatMap((i) => i)
						.join(', ')}
					- Removed indexes: ${Object.keys(migration.removedIndexes)
						.map((col) =>
							migration.removedIndexes[col].map((i) => `${col}.${i.name}`),
						)
						.flatMap((i) => i)
						.join(', ')}
			`,
		);
	}
	context.pauseRebasing = false;
}
