import {
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
	initialToPatches,
	removeOidPropertiesFromAllSubObjects,
	AuthorizationKey,
} from '@verdant-web/common';
import { Context } from '../context.js';
import { Metadata } from '../metadata/Metadata.js';
import { findAllOids, findOneOid } from '../queries/dbQueries.js';
import { OpenDocumentDbContext } from './types.js';

function getMigrationMutations({
	migration,
	meta,
	getMigrationNow,
	newOids,
}: {
	migration: Migration<any>;
	newOids: string[];
	getMigrationNow: () => string;
	meta: Metadata;
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

				await meta.insertLocalOperations(
					initialToPatches(doc, oid, getMigrationNow, undefined, undefined, {
						authz: options?.access,
					}),
				);
				return doc;
			},
			delete: async (id: string) => {
				const rootOid = createOid(collectionName, id);
				const authz = await meta.getDocumentAuthz(rootOid);
				const allOids = await meta.getAllDocumentRelatedOids(rootOid);
				return meta.insertLocalOperations(
					allOids.map((oid) => ({
						oid,
						timestamp: getMigrationNow(),
						data: { op: 'delete' },
						authz,
					})),
				);
			},
		};
		return acc;
	}, {} as any);
}

function getMigrationQueries({
	migration,
	context,
	meta,
}: {
	migration: Migration<any>;
	context: Context;
	meta: Metadata;
}) {
	return migration.oldCollections.reduce((acc, collectionName) => {
		acc[collectionName] = {
			get: async (id: string) => {
				const oid = createOid(collectionName, id);
				const doc = await meta.getDocumentSnapshot(oid, {
					// only get the snapshot up to the previous version (newer operations may have synced)
					to: meta.time.now(migration.oldSchema.version),
				});
				return doc;
			},
			findOne: async (filter: CollectionFilter) => {
				const oid = await findOneOid({
					collection: collectionName,
					index: filter,
					context,
				});
				if (!oid) return null;
				const doc = await meta.getDocumentSnapshot(oid, {
					// only get the snapshot up to the previous version (newer operations may have synced)
					to: meta.time.now(migration.oldSchema.version),
				});
				return doc;
			},
			findAll: async (filter: CollectionFilter) => {
				const oids = await findAllOids({
					collection: collectionName,
					index: filter,
					context,
				});
				const docs = await Promise.all(
					oids.map((oid) =>
						meta.getDocumentSnapshot(oid, {
							// only get the snapshot up to the previous version (newer operations may have synced)
							to: meta.time.now(migration.oldSchema.version),
						}),
					),
				);
				return docs;
			},
		};
		return acc;
	}, {} as any);
}

export function getMigrationEngine({
	meta,
	migration,
	context,
}: {
	log?: (...args: any[]) => void;
	migration: Migration;
	meta: Metadata;
	context: Context;
}): MigrationEngine {
	function getMigrationNow() {
		return meta.time.zero(migration.version);
	}

	const newOids = new Array<ObjectIdentifier>();

	const queries = getMigrationQueries({
		migration,
		context,
		meta,
	});
	const mutations = getMigrationMutations({
		migration,
		getMigrationNow,
		newOids,
		meta,
	});
	const deleteCollection = async (collection: string) => {
		const allOids = await meta.getAllCollectionRelatedOids(collection);
		return meta.insertLocalOperations(
			allOids.map((oid) => ({
				oid,
				timestamp: getMigrationNow(),
				data: { op: 'delete' },
			})),
		);
	};
	const awaitables = new Array<Promise<any>>();
	const engine: MigrationEngine = {
		log: context.log,
		newOids,
		deleteCollection,
		migrate: async (collection, strategy) => {
			const docs = await queries[collection].findAll();

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
							getMigrationNow,
							undefined,
							[],
							{
								mergeUnknownObjects: true,
								authz,
							},
						);
						if (patches.length > 0) {
							await meta.insertLocalOperations(patches);
						}
					}
				}),
			);
		},
		queries,
		mutations,
		awaitables,
	};
	return engine;
}

export function getInitialMigrationEngine({
	meta,
	migration,
	context,
}: {
	context: OpenDocumentDbContext;
	migration: Migration;
	meta: Metadata;
}): MigrationEngine {
	function getMigrationNow() {
		return meta.time.zero(migration.version);
	}

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
		getMigrationNow,
		newOids,
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
	};
	return engine;
}
