import {
	AuthorizationKey,
	DocumentBaseline,
	FileData,
	ObjectIdentifier,
	Operation,
	StorageObjectFieldSchema,
	VerdantError,
	assert,
	assignOid,
	decomposeOid,
	getOidRoot,
	groupBaselinesByRootOid,
	groupPatchesByOid,
	groupPatchesByRootOid,
	isRootOid,
	removeOidsFromAllSubObjects,
} from '@verdant-web/common';
import { WeakEvent } from 'weak-event';
import { Context } from '../context/context.js';
import { FileManager } from '../files/FileManager.js';
import { processValueFiles } from '../files/utils.js';
import { Disposable } from '../utils/Disposable.js';
import { Entity } from './Entity.js';
import { EntityFamilyMetadata } from './EntityMetadata.js';
import { OperationBatcher } from './OperationBatcher.js';

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
	private files;
	private batcher;
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

	constructor({ ctx, files }: { ctx: Context; files: FileManager }) {
		super();

		this.ctx = ctx;
		this.files = files;
		this.batcher = new OperationBatcher({
			ctx,
			entities: this,
		});
		this.addDispose(
			this.ctx.internalEvents.subscribe('persistenceReset', this.clearCache),
		);
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
		await (await this.ctx.documents).reset();
		this.events.resetAll.invoke(this);
		this.cache.clear();
	};

	private resetData = async () => {
		if (this.disposed) {
			this.ctx.log('warn', 'EntityStore is disposed, not resetting local data');
			return;
		}
		await (await this.ctx.meta).reset();
		await (await this.ctx.documents).reset();
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

		if (baselines.length === 0 && operations.length === 0) {
			this.ctx.log('debug', 'No data to process');
			return;
		}

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
				this.ctx.log('debug', 'Waiting for ongoing entity hydration', oid);
				hydrationPromise.then(() => {
					event.invoke(this, {
						oid,
						baselines,
						operations: groupedOperations,
						isLocal: false,
					});
				});
			} else {
				this.ctx.log('debug', 'Applying data to entity', oid);
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
		await (await this.ctx.meta).insertData(data, abortOptions);
		this.ctx.log(
			'debug',
			'Data processing complete, all data saved to metadata db.',
		);

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
			this.ctx.log('debug', 'Saving entities to queryable storage');
			await (await this.ctx.documents).saveEntities(entities, abortOptions);
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
			const cached = this.cache.get(oid);
			if (cached) {
				const entity = cached.deref();
				if (entity) {
					if (entity.deleted) {
						this.ctx.log('debug', 'Cached entity is deleted', oid);
						// debugger;
						return null;
					}
					this.ctx.log('debug', 'Using cached hydrated entity', oid);
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
				this.ctx.log('warn', 'Entity schema not found, cannot construct', oid);
				return null;
			}
			const pendingPromise = this.loadEntity(entity, opts);
			pendingPromise.finally(() => {
				this.pendingEntityPromises.delete(oid);
				this.ctx.log('debug', 'Hydration complete', oid);
			});
			this.pendingEntityPromises.set(oid, pendingPromise);
			return pendingPromise;
		} else {
			this.ctx.log('debug', 'Waiting for ongoing entity hydration', oid);
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
		const fileRefs: FileData[] = [];
		const processed = processValueFiles(initial, fileRefs.push.bind(fileRefs));

		assignOid(processed, oid);

		// validate that schema exists
		const { schema } = this.getCollectionSchema(collection);
		if (!schema) {
			throw new Error(`Collection schema not found for ${collection}`);
		}

		const operations = this.ctx.patchCreator.createInitialize(
			processed,
			oid,
			access,
		);
		await this.batcher.commitOperations(operations, {
			undoable: !!undoable,
		});

		// TODONE: what happens if you create an entity with an OID that already
		// exists?
		// A: it will overwrite the existing entity

		// wait for the entity to load and cache before returning
		const entity = await this.hydrate(oid);
		if (!entity) {
			// something failed when creating the entity
			this.ctx.log(
				'error',
				'Failed to create entity; hydrated entity is null. Hopefully an error is logged above.',
				oid,
			);
			throw new VerdantError(
				VerdantError.Code.Unexpected,
				undefined,
				`Failed to create document ${oid}`,
			);
		}
		// add files with entity as parent
		// note: these .add invocations have async behavior -- it should upload any files to the
		// server if sync is active. but we don't need to wait for it to make the entity usable as file
		// data should already be locally available.
		this.ctx.log(
			'debug',
			'Associating',
			fileRefs.length,
			'files to new entity',
			oid,
		);
		fileRefs.forEach((file) => this.files.add(file, entity));
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

		const operations: Operation[] = [];
		for (const entity of entities) {
			if (entity) {
				const oids = entity.__getFamilyOids__();
				const deletes = this.ctx.patchCreator.createDeleteAll(oids);
				for (const op of deletes) {
					op.authz = entity.access;
				}
				operations.push(...deletes);
			}
		}

		await this.batcher.commitOperations(operations, {
			undoable: options?.undoable === undefined ? true : options.undoable,
		});

		// remove the entities from cache
		oids.forEach((oid) => {
			this.cache.delete(oid);
			this.ctx.log('debug', 'Deleted document from cache', oid);
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
	 * Constructs an entity from an OID, but does not load it or add it to the cache.
	 */
	private constructEntity = (oid: string): Entity | null => {
		assert(!!oid, 'Cannot construct entity without OID');
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
		await this.loadEntityData(entity, opts);

		// only set the cache after loading.
		// TODO: is this cache/promise stuff redundant?
		this.cache.set(entity.oid, this.ctx.weakRef(entity));
		this.entityFinalizationRegistry.register(entity, entity.oid);

		return entity;
	};

	private loadEntityData = async (
		entity: Entity,
		opts?: { abort: AbortSignal },
	) => {
		const { operations, baselines } = await (
			await this.ctx.meta
		).getDocumentData(entity.oid, opts);

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

		return entity;
	};

	/**
	 * Drops all entities from the cache. Any entities
	 * referenced will go 'dead'...
	 */
	clearCache = () => {
		this.ctx.log('debug', 'Emptying entity cache');
		this.cache.clear();
	};
}
