import {
	AuthorizationKey,
	CollectionFilter,
	Migration,
	MigrationEngine,
	ObjectIdentifier,
	addFieldDefaults,
	assert,
	assignOidsToAllSubObjects,
	cloneDeep,
	createOid,
	diffToPatches,
	getOid,
	removeOidPropertiesFromAllSubObjects,
} from '@verdant-web/common';
import { ContextWithoutPersistence } from '../../context/context.js';
import { PersistenceDocumentDb, PersistenceNamespace } from '../interfaces.js';
import { PersistenceMetadata } from '../PersistenceMetadata.js';

function getMigrationMutations({
	migration,
	newOids,
	ctx,
	meta,
}: {
	migration: Migration<any>;
	newOids: string[];
	ctx: ContextWithoutPersistence;
	meta: PersistenceMetadata;
}) {
	return migration.allCollections.reduce((acc, collectionName) => {
		acc[collectionName] = {
			put: async (doc: any, options?: { access?: AuthorizationKey }) => {
				// add defaults
				addFieldDefaults(migration.newSchema.collections[collectionName], doc);
				const primaryKey =
					doc[migration.newSchema.collections[collectionName].primaryKey];
				const oid = createOid(collectionName, primaryKey);
				newOids.push(oid);

				await ctx.time.withMigrationTime(migration.version, () =>
					meta.insertData({
						operations: ctx.patchCreator.createInitialize(
							doc,
							oid,
							options?.access,
						),
						isLocal: true,
					}),
				);
				return doc;
			},
			delete: async (id: string) => {
				const rootOid = createOid(collectionName, id);
				await ctx.time.withMigrationTime(migration.version, () =>
					meta.deleteDocument(rootOid),
				);
			},
		};
		return acc;
	}, {} as any);
}

function getMigrationQueries({
	migration,
	context,
	documents,
	meta,
}: {
	migration: Migration<any>;
	context: ContextWithoutPersistence;
	documents: PersistenceDocumentDb;
	meta: PersistenceMetadata;
}) {
	return migration.oldCollections.reduce((acc, collectionName) => {
		acc[collectionName] = {
			get: async (id: string) => {
				const oid = createOid(collectionName, id);
				const doc = await meta.getDocumentSnapshot(oid, {
					// only get the snapshot up to the previous version (newer operations may have synced)
					to: context.time.nowWithVersion(migration.oldSchema.version),
				});
				return doc;
			},
			findOne: async (filter: CollectionFilter) => {
				const oid = await documents.findOneOid({
					collection: collectionName,
					index: filter,
				});
				if (!oid) return null;
				const doc = await meta.getDocumentSnapshot(oid, {
					// only get the snapshot up to the previous version (newer operations may have synced)
					to: context.time.nowWithVersion(migration.oldSchema.version),
				});
				return doc;
			},
			findAll: async (filter: CollectionFilter) => {
				const { result: oids } = await documents.findAllOids({
					collection: collectionName,
					index: filter,
				});
				const docs = await Promise.all(
					oids.map(async (oid) =>
						meta.getDocumentSnapshot(oid, {
							// only get the snapshot up to the previous version (newer operations may have synced)
							to: context.time.nowWithVersion(migration.oldSchema.version),
						}),
					),
				);
				return docs;
			},
		};
		return acc;
	}, {} as any);
}

export async function getMigrationEngine({
	migration,
	context,
	ns,
	meta,
}: {
	log?: (...args: any[]) => void;
	migration: Migration;
	context: ContextWithoutPersistence;
	ns: PersistenceNamespace;
	meta: PersistenceMetadata;
}): Promise<MigrationEngine> {
	const migrationContext = context.cloneWithOptions({
		schema: migration.oldSchema,
	});
	if (migration.oldSchema.version === 0) {
		return getInitialMigrationEngine({
			migration,
			context: migrationContext,
			meta,
		});
	}

	const newOids = new Array<ObjectIdentifier>();

	const documents = await ns.openDocuments(migrationContext);
	const queries = getMigrationQueries({
		migration,
		context: migrationContext,
		documents,
		meta,
	});
	const mutations = getMigrationMutations({
		migration,
		newOids,
		ctx: migrationContext,
		meta,
	});
	const deleteCollection = async (collection: string) => {
		await meta.deleteCollection(collection);
	};
	const awaitables = new Array<Promise<any>>();
	const engine: MigrationEngine = {
		log: context.log,
		newOids,
		deleteCollection,
		migrate: async (collection, strategy) => {
			const docs = await queries[collection].findAll();
			context.log(
				'debug',
				`Migrating ${docs.length} documents in ${collection}`,
			);

			await Promise.all(
				docs.filter(Boolean).map(async (doc: any) => {
					const rootOid = getOid(doc);
					assert(
						!!rootOid,
						`Document is missing an OID: ${JSON.stringify(doc)}`,
					);
					// FIXME: this could be optimized (making n queries for authz
					// when the snapshots themselves are derived from the same data...)
					// maybe don't use the findAll query, and instead go a level
					// lower to retain access to lower level data here?
					const authz = await meta.getDocumentAuthz(rootOid);
					const original = cloneDeep(doc);
					// @ts-ignore - excessive type resolution
					const newValue = await strategy(doc);
					if (newValue) {
						// the migration has altered the shape of our document. we need
						// to create the operation from the diff and write it to meta as
						// a migration patch
						removeOidPropertiesFromAllSubObjects(original);
						removeOidPropertiesFromAllSubObjects(newValue);
						assignOidsToAllSubObjects(newValue);
						const patches = diffToPatches(
							original,
							newValue,
							() => context.time.zeroWithVersion(migration.version),
							undefined,
							[],
							{
								// incoming unknown objects are assumed to be the same
								// as any pre-existing object.
								mergeUnknownObjects: true,
								// if a field is undefined in the new value, it should be
								// erased. this is the only way to allow users to remove
								// entries in maps during migrations. it is a little
								// dangerous for other types, though.
								defaultUndefined: false,
								authz,
							},
						);
						if (patches.length > 0) {
							await meta.insertData({
								operations: patches,
								isLocal: true,
							});
						}
					}
				}),
			);
		},
		queries,
		mutations,
		awaitables,
		close: async () => {
			await documents.close();
		},
	};
	return engine;
}

function getInitialMigrationEngine({
	migration,
	context,
	meta,
}: {
	context: ContextWithoutPersistence;
	migration: Migration;
	meta: PersistenceMetadata;
}): MigrationEngine {
	const newOids = new Array<ObjectIdentifier>();

	const queries = new Proxy({} as any, {
		get() {
			throw new Error(
				'Queries are not available in initial migrations; there is no database yet!',
			);
		},
	}) as any;

	const mutations = getMigrationMutations({
		migration,
		newOids,
		ctx: context,
		meta,
	});
	const engine: MigrationEngine = {
		log: context.log,
		newOids,
		deleteCollection: () => {
			throw new Error(
				'Calling deleteCollection() in initial migrations is not supported! Use initial migrations to seed initial data using mutations.',
			);
		},
		migrate: () => {
			throw new Error(
				'Calling migrate() in initial migrations is not supported! Use initial migrations to seed initial data using mutations.',
			);
		},
		queries,
		mutations,
		awaitables: [],
		close: () => Promise.resolve(),
	};
	return engine;
}
