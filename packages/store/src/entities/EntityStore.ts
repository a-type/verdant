import {
	DocumentBaseline,
	ObjectIdentifier,
	Operation,
	StorageFieldsSchema,
	StorageObjectFieldSchema,
	assert,
	assignOid,
	decomposeOid,
	getOidRoot,
	groupBaselinesByRootOid,
	groupPatchesByOid,
	groupPatchesByRootOid,
	isRootOid,
	removeOidsFromAllSubObjects,
	AuthorizationKey,
} from '@verdant-web/common';
import { Context } from '../context.js';
import { Metadata } from '../metadata/Metadata.js';
import { Entity } from './Entity.js';
import { Disposable } from '../utils/Disposable.js';
import { EntityFamilyMetadata } from './EntityMetadata.js';
import { FileManager } from '../files/FileManager.js';
import { OperationBatcher } from './OperationBatcher.js';
import { QueryableStorage } from '../queries/QueryableStorage.js';
import { WeakEvent } from 'weak-event';
import { processValueFiles } from '../files/utils.js';

enum AbortReason {
	Reset,
}

export type EntityStoreEventData = {
	oid: ObjectIdentifier;
	operations?: Record<string, Operation[]>;
	baselines?: DocumentBaseline[];
	isLocal: boolean;
};

export type EntityStoreEvents = {
	add: WeakEvent<EntityStore, EntityStoreEventData>;
	replace: WeakEvent<EntityStore, EntityStoreEventData>;
	resetAll: WeakEvent<EntityStore, void>;
};

export interface IncomingData {
	operations?: Operation[];
	baselines?: DocumentBaseline[];
	reset?: boolean;
	isLocal?: boolean;
}

export interface EntityCreateOptions {
	undoable?: boolean;
	access?: AuthorizationKey;
}

export class EntityStore extends Disposable {
	private ctx;
	private meta;
	private files;
	private batcher;
	private queryableStorage;
	private events: EntityStoreEvents = {
		add: new WeakEvent(),
		replace: new WeakEvent(),
		resetAll: new WeakEvent(),
	};
	private cache = new Map<ObjectIdentifier, WeakRef<Entity>>();
	private pendingEntityPromises = new Map<
		ObjectIdentifier,
		Promise<Entity | null>
	>();
	// halts the current data queue processing
	private abortDataQueueController = new AbortController();
	private ongoingResetPromise: Promise<void> | null = null;
	private entityFinalizationRegistry = new FinalizationRegistry(
		(oid: ObjectIdentifier) => {
			this.ctx.log('debug', 'Entity GC', oid);
		},
	);

	constructor({
		ctx,
		meta,
		files,
	}: {
		ctx: Context;
		meta: Metadata;
		files: FileManager;
	}) {
		super();

		this.ctx = ctx;
		this.meta = meta;
		this.files = files;
		this.queryableStorage = new QueryableStorage({ ctx });
		this.batcher = new OperationBatcher({
			ctx,
			meta,
			entities: this,
		});
	}

	// expose batch APIs
	get batch() {
		return this.batcher.batch;
	}
	get flushAllBatches() {
		return this.batcher.flushAll;
	}

	// internal-ish API to load remote / stored data
	addData = async (data: IncomingData) => {
		if (this.disposed) {
			this.ctx.log('warn', 'EntityStore is disposed, not adding incoming data');
			return;
		}
		// for resets - abort any other changes, reset everything,
		// then proceed
		if (data.reset) {
			this.ctx.log(
				'info',
				'Resetting local store to replicate remote synced data - dropping any current transactions',
			);
			// cancel any other ongoing data - it will all
			// be replaced by the reset
			this.abortDataQueueController.abort(AbortReason.Reset);
			this.abortDataQueueController = new AbortController();
			this.ongoingResetPromise = this.resetData().finally(() => {
				this.ongoingResetPromise = null;
				this.ctx.globalEvents.emit('resetToServer');
			});
		}

		// await either the reset we just started, or any that was
		// in progress when this data came in.
		if (this.ongoingResetPromise) {
			this.ctx.log('debug', 'Waiting for ongoing reset to complete');
			await this.ongoingResetPromise;
			this.ctx.log('debug', 'Ongoing reset complete');
		}

		await this.processData(data);
	};

	empty = async () => {
		await this.queryableStorage.reset();
		this.events.resetAll.invoke(this);
		this.cache.clear();
	};

	private resetData = async () => {
		if (this.disposed) {
			this.ctx.log('warn', 'EntityStore is disposed, not resetting local data');
			return;
		}
		await this.meta.reset();
		await this.queryableStorage.reset();
		this.events.resetAll.invoke(this);
	};

	private processData = async (data: IncomingData) => {
		if (this.disposed) {
			this.ctx.log(
				'warn',
				'EntityStore is disposed, not processing incoming data',
			);
			return;
		}

		const baselines = data?.baselines ?? [];
		const operations = data?.operations ?? [];

		this.ctx.log('debug', 'Processing incoming data', {
			operations: operations.length,
			baselines: baselines.length,
			reset: !!data.reset,
		});

		const allDocumentOids: ObjectIdentifier[] = Array.from(
			new Set(
				baselines
					.map((b) => getOidRoot(b.oid))
					.concat(operations.map((o) => getOidRoot(o.oid))),
			),
		);
		const baselinesGroupedByOid = groupBaselinesByRootOid(baselines);
		const operationsGroupedByOid = groupPatchesByRootOid(operations);

		this.ctx.log('debug', 'Applying data to live entities');
		// synchronously add/replace data in any open entities via eventing
		for (const oid of allDocumentOids) {
			const baselines = baselinesGroupedByOid[oid];
			const operations = operationsGroupedByOid[oid] ?? [];
			const groupedOperations = groupPatchesByOid(operations);
			// what happens if an entity is being hydrated
			// while this is happening? - we wait for the hydration promise
			// to complete, then invoke the event
			const event = data.reset ? this.events.replace : this.events.add;
			const hydrationPromise = this.pendingEntityPromises.get(oid);
			if (hydrationPromise) {
				hydrationPromise.then(() => {
					event.invoke(this, {
						oid,
						baselines,
						operations: groupedOperations,
						isLocal: false,
					});
				});
			} else {
				event.invoke(this, {
					oid,
					baselines,
					operations: groupedOperations,
					isLocal: false,
				});
			}
		}

		const abortOptions = {
			abort: this.abortDataQueueController.signal,
		};

		// then, asynchronously add to the database
		// this also emits messages to sync
		// TODO: could messages be sent to sync before storage,
		// so that realtime is lower latency? What would happen
		// if the storage failed?
		await this.meta.insertData(data, abortOptions);

		// recompute all affected documents for querying
		const entities = await Promise.all(
			allDocumentOids.map(async (oid) => {
				const entity = await this.hydrate(oid, abortOptions);
				// if the entity is not found, we return a stub that
				// indicates it's deleted and should be cleared
				return (
					entity ?? {
						oid,
						getSnapshot(): any {
							return null;
						},
					}
				);
			}),
		);
		try {
			await this.queryableStorage.saveEntities(entities, abortOptions);
		} catch (err) {
			if (this.disposed) {
				this.ctx.log(
					'warn',
					'Error saving entities to queryable storage - EntityStore is disposed',
					err,
				);
			} else {
				this.ctx.log(
					'error',
					'Error saving entities to queryable storage',
					err,
				);
			}
		}
	};

	// internal-ish API for creating Entities from OIDs
	// when query results come in
	hydrate = async (
		oid: string,
		opts?: { abort: AbortSignal },
	): Promise<Entity | null> => {
		if (!isRootOid(oid)) {
			throw new Error('Cannot hydrate non-root entity');
		}

		if (this.cache.has(oid)) {
			this.ctx.log('debug', 'Hydrating entity from cache', oid);
			const cached = this.cache.get(oid);
			if (cached) {
				const entity = cached.deref();
				if (entity) {
					if (entity.deleted) {
						return null;
					}
					return entity;
				} else {
					this.ctx.log('debug', "Removing GC'd entity from cache", oid);
					this.cache.delete(oid);
				}
			}
		}

		// we don't want to hydrate two entities in parallel, so
		// we use a promise to ensure that only one is ever
		// constructed at a time
		const pendingPromise = this.pendingEntityPromises.get(oid);
		if (!pendingPromise) {
			this.ctx.log('debug', 'Hydrating entity from storage', oid);
			const entity = this.constructEntity(oid);
			if (!entity) {
				return null;
			}
			const pendingPromise = this.loadEntity(entity, opts);
			pendingPromise.finally(() => {
				this.pendingEntityPromises.delete(oid);
			});
			this.pendingEntityPromises.set(oid, pendingPromise);
			return pendingPromise;
		} else {
			this.ctx.log('debug', 'Waiting for entity hydration', oid);
			return pendingPromise;
		}
	};

	destroy = async () => {
		this.dispose();
		await this.batcher.flushAll();
	};

	// public APIs for manipulating entities

	/**
	 * Creates a new Entity with the given initial data.
	 */
	create = async (
		initial: any,
		oid: ObjectIdentifier,
		{ undoable = true, access }: EntityCreateOptions = {},
	) => {
		this.ctx.log('debug', 'Creating new entity', oid);
		const { collection } = decomposeOid(oid);
		// remove any OID associations from the initial data
		removeOidsFromAllSubObjects(initial);
		// grab files and replace them with refs
		const processed = processValueFiles(initial, this.files.add);

		assignOid(processed, oid);

		// creating a new Entity with no data, then preloading the operations
		const entity = this.constructEntity(oid);
		if (!entity) {
			throw new Error(
				`Could not put new document: no schema exists for collection ${collection}`,
			);
		}

		const operations = this.meta.patchCreator.createInitialize(processed, oid);
		if (access) {
			operations.forEach((op) => {
				op.authz = access;
			});
		}
		await this.batcher.commitOperations(operations, {
			undoable: !!undoable,
			source: entity,
		});

		// TODONE: what happens if you create an entity with an OID that already
		// exists?
		// A: it will overwrite the existing entity

		// we still need to synchronously add the initial operations to the Entity
		// even though they are flowing through the system
		// FIXME: this could be better aligned to avoid grouping here
		const operationsGroupedByOid = groupPatchesByOid(operations);
		this.events.add.invoke(this, {
			operations: operationsGroupedByOid,
			isLocal: true,
			oid,
		});
		this.cache.set(oid, this.ctx.weakRef(entity));

		return entity;
	};

	deleteAll = async (
		oids: ObjectIdentifier[],
		options?: { undoable?: boolean },
	) => {
		this.ctx.log('info', 'Deleting documents', oids);
		assert(
			oids.every((oid) => oid === getOidRoot(oid)),
			'Only root documents may be deleted via client methods',
		);

		const entities = await Promise.all(oids.map((oid) => this.hydrate(oid)));

		// remove the entities from cache
		oids.forEach((oid) => {
			this.cache.delete(oid);
			this.ctx.log('debug', 'Deleted document from cache', oid);
		});

		const operations: Operation[] = [];
		for (const entity of entities) {
			if (entity) {
				const oids = entity.__getFamilyOids__();
				const deletes = this.meta.patchCreator.createDeleteAll(oids);
				for (const op of deletes) {
					op.authz = entity.access;
				}
				operations.push(...deletes);
			}
		}

		await this.batcher.commitOperations(operations, {
			undoable: options?.undoable === undefined ? true : options.undoable,
		});
	};

	delete = async (oid: ObjectIdentifier, options?: { undoable?: boolean }) => {
		return this.deleteAll([oid], options);
	};

	private getCollectionSchema = (
		collectionName: string,
	): {
		schema: StorageObjectFieldSchema<any> | null;
		readonlyKeys: string[];
	} => {
		const schema = this.ctx.schema.collections[collectionName];
		if (!schema) {
			this.ctx.log('warn', `Missing schema for collection: ${collectionName}`);
			return {
				schema: null,
				readonlyKeys: [],
			};
		}
		return {
			// convert to object schema for compatibility
			schema: {
				type: 'object',
				nullable: false,
				properties: schema.fields as any,
			},
			readonlyKeys: [schema.primaryKey],
		};
	};

	/**
	 * Constructs an entity from an OID, but does not load it.
	 */
	private constructEntity = (oid: string): Entity | null => {
		const { collection } = decomposeOid(oid);
		const { schema, readonlyKeys } = this.getCollectionSchema(collection);

		if (!schema) {
			return null;
		}

		if (this.disposed) {
			throw new Error('Cannot hydrate entity after store has been disposed');
		}

		const metadataFamily = new EntityFamilyMetadata({
			ctx: this.ctx,
			onPendingOperations: this.onPendingOperations,
			rootOid: oid,
		});

		// this is created synchronously so it's immediately available
		// to begin capturing incoming data.
		return new Entity({
			ctx: this.ctx,
			oid,
			schema,
			readonlyKeys,
			files: this.files,
			metadataFamily: metadataFamily,
			patchCreator: this.meta.patchCreator,
			storeEvents: this.events,
			deleteSelf: this.delete.bind(this, oid),
		});
	};

	private onPendingOperations = (operations: Operation[]) => {
		this.batcher.addOperations(operations);
	};

	discardPendingOperation = (operation: Operation) => {
		const root = getOidRoot(operation.oid);
		this.cache.get(root)?.deref()?.__discardPendingOperation__(operation);
	};

	/**
	 * Loads initial Entity data from storage
	 */
	private loadEntity = async (
		entity: Entity,
		opts?: { abort: AbortSignal },
	): Promise<Entity | null> => {
		const { operations, baselines } = await this.meta.getDocumentData(
			entity.oid,
			opts,
		);

		if (!baselines.length && !Object.keys(operations).length) {
			this.ctx.log('debug', 'No data found for entity', entity.oid);
			return null;
		}

		this.ctx.log('debug', 'Loaded entity from storage', entity.oid);

		this.events.replace.invoke(this, {
			oid: entity.oid,
			baselines,
			operations,
			isLocal: false,
		});

		// only set the cache after loading.
		// TODO: is this cache/promise stuff redundant?
		this.cache.set(entity.oid, this.ctx.weakRef(entity));
		this.entityFinalizationRegistry.register(entity, entity.oid);

		return entity;
	};
}
