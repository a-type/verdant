import {
	decomposeOid,
	getOidRoot,
	Migration,
	MigrationEngine,
} from '@verdant-web/common';
import { ContextWithoutPersistence } from '../../context/context.js';
import { ClientOperation, PersistenceDocumentDb } from '../interfaces.js';
import { PersistenceMetadata } from '../PersistenceMetadata.js';

export async function finalizeMigration({
	ctx,
	documents,
	migration,
	meta,
	engine,
}: {
	ctx: ContextWithoutPersistence;
	documents: PersistenceDocumentDb;
	meta: PersistenceMetadata;
	migration: Migration<any>;
	engine: MigrationEngine;
}) {
	/**
	 * In cases where operations from the future have been
	 * received by this client, we may have created entire
	 * documents in metadata which were not written to storage
	 * because all of their operations were in the future (
	 * i.e. in the next version). We have to find those documents
	 * and also write their snapshots to storage, because they
	 * won't be present in storage already to 'refresh,' so
	 * if we don't analyze metadata for 'future' operations like
	 * this, we won't know they exist.
	 *
	 * This led to behavior where the metadata would be properly
	 * synced, but after upgrading the app and migrating, items
	 * would be missing from findAll and findOne queries.
	 */
	const docsWithUnappliedMigrations = await getDocsWithUnappliedMigrations({
		currentVersion: migration.oldSchema.version,
		newVersion: migration.newSchema.version,
		ctx,
		meta,
	});

	// once the schema is ready, we can write back the migrated documents

	for (const collection of migration.allCollections) {
		// map the keys to OIDs
		const { result: oids } = await documents.findAllOids({
			collection,
		});
		oids.push(
			...engine.newOids.filter((oid) => {
				return decomposeOid(oid).collection === collection;
			}),
			...docsWithUnappliedMigrations.filter((oid) => {
				return decomposeOid(oid).collection === collection;
			}),
		);

		const snapshots = await Promise.all(
			oids.map(async (oid) => {
				try {
					const snap = await meta.getDocumentSnapshot(oid);
					return [oid, snap];
				} catch (e) {
					// this seems to happen with baselines/ops which are not fully
					// cleaned up after deletion?
					ctx.log(
						'error',
						'Could not regenerate snapshot during migration for oid',
						oid,
						'this document will not be preserved',
						e,
					);
					return null;
				}
			}),
		);

		const views: [string, any][] = snapshots.filter(
			(s: any): s is [string, any] => !!s,
		);

		// now we can write the documents back
		await documents.saveEntities(
			views.map(([oid, snapshot]) => ({
				oid,
				getSnapshot() {
					return snapshot;
				},
			})),
			{
				collections: [collection],
			},
		);
	}
}

/**
 * Gets a list of root OIDs for all documents which had operations stored already
 * that were not applied to their queryable snapshots because they were in the
 * future. These documents need to be refreshed in storage.
 */
async function getDocsWithUnappliedMigrations({
	currentVersion,
	newVersion: _,
	ctx,
	meta,
}: {
	currentVersion: number;
	newVersion: number;
	ctx: ContextWithoutPersistence;
	meta: PersistenceMetadata;
}) {
	// scan for all operations in metadata after the current version.
	// this could be more efficient if also filtering below or equal newVersion but
	// that seems so unlikely in practice...
	const unappliedOperations: ClientOperation[] = [];
	await meta.iterateAllOperations(
		(op) => {
			unappliedOperations.push(op);
		},
		{
			from: ctx.time.zeroWithVersion(currentVersion + 1),
		},
	);
	return Array.from(
		new Set(unappliedOperations.map((op) => getOidRoot(op.oid))),
	);
}
