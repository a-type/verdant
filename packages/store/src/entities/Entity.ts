import {
	DocumentBaseline,
	EntityValidationProblem,
	EventSubscriber,
	ObjectIdentifier,
	Operation,
	PatchCreator,
	StorageFieldSchema,
	StorageFieldsSchema,
	assert,
	assignOid,
	cloneDeep,
	compareRefs,
	createFileRef,
	createRef,
	getChildFieldSchema,
	getDefault,
	hasDefault,
	isFileRef,
	isNullable,
	isObject,
	isObjectRef,
	isPrunePoint,
	isRef,
	maybeGetOid,
	memoByKeys,
	traverseCollectionFieldsAndApplyDefaults,
	validateEntityField,
} from '@verdant-web/common';
import { Context } from '../context.js';
import { FileManager } from '../files/FileManager.js';
import { isFile, processValueFiles } from '../files/utils.js';
import { EntityFile } from '../index.js';
import { EntityCache } from './EntityCache.js';
import { EntityFamilyMetadata, EntityMetadataView } from './EntityMetadata.js';
import {
	BaseEntityValue,
	DataFromInit,
	DeepPartial,
	EntityChange,
	EntityEvents,
	ListEntity,
	ListItemInit,
	ListItemValue,
	ObjectEntity,
} from './types.js';
import { EntityStoreEventData, EntityStoreEvents } from './EntityStore.js';

export interface EntityInit {
	oid: ObjectIdentifier;
	schema: StorageFieldSchema;
	entityFamily?: EntityCache;
	metadataFamily: EntityFamilyMetadata;
	parent?: Entity;
	ctx: Context;
	files: FileManager;
	readonlyKeys?: string[];
	fieldPath?: (string | number)[];
	patchCreator: PatchCreator;
	events: EntityStoreEvents;
}

export class Entity<
		Init = any,
		KeyValue extends BaseEntityValue = any,
		Snapshot extends any = DataFromInit<Init>,
	>
	extends EventSubscriber<EntityEvents>
	implements
		ObjectEntity<Init, KeyValue, Snapshot>,
		ListEntity<Init, KeyValue, Snapshot>
{
	readonly oid: ObjectIdentifier;
	private readonlyKeys: string[];
	private fieldPath: (string | number)[] = [];
	// these are shared between all entities in this family
	private entityFamily: EntityCache;
	private metadataFamily;

	private schema;
	private parent: Entity | undefined;
	private ctx;
	private files;
	private patchCreator;
	private events;

	// an internal representation of this Entity.
	// if present, this is the cached, known value. If null,
	// the entity is deleted. If undefined, we need to recompute
	// the view.
	private _viewData: EntityMetadataView | undefined = undefined;
	private validationError: EntityValidationProblem | undefined = undefined;
	private cachedDeepUpdatedAt: number | null = null;
	// only used for root entities to track delete/restore state.
	private wasDeletedLastChange = false;
	private cachedView: any | undefined = undefined;

	constructor({
		oid,
		schema,
		entityFamily: childCache,
		parent,
		ctx,
		metadataFamily,
		readonlyKeys,
		files,
		patchCreator,
		events,
	}: EntityInit) {
		super();

		assert(!!oid, 'oid is required');

		this.oid = oid;
		this.readonlyKeys = readonlyKeys || [];
		this.ctx = ctx;
		this.files = files;
		this.schema = schema;
		this.entityFamily =
			childCache ||
			new EntityCache({
				initial: [this],
			});
		this.patchCreator = patchCreator;
		this.metadataFamily = metadataFamily;
		this.events = events;
		this.parent = parent;

		// TODO: should any but the root entity be listening to these?
		if (!this.parent) {
			events.add.attach(this.onAdd);
			events.replace.attach(this.onReplace);
			events.resetAll.attach(this.onResetAll);
		}
	}

	private onAdd = (_store: any, data: EntityStoreEventData) => {
		if (data.oid === this.oid) {
			this.addConfirmedData(data);
		}
	};
	private onReplace = (_store: any, data: EntityStoreEventData) => {
		if (data.oid === this.oid) {
			this.replaceAllData(data);
		}
	};
	private onResetAll = () => {
		this.resetAllData();
	};

	private get metadata() {
		return this.metadataFamily.get(this.oid);
	}

	/**
	 * The view of this Entity, not including nested
	 * entities (that's the snapshot - see #getSnapshot())
	 *
	 * Nested entities are represented by refs.
	 */
	private get viewData() {
		if (this._viewData === undefined) {
			this._viewData = this.metadata.computeView();
			this.validate();
		}
		return this._viewData;
	}

	/** convenience getter for viewData.view */
	private get rawView() {
		return this.viewData.view;
	}

	/**
	 * An Entity's View includes the rendering of its underlying data,
	 * connecting of children where refs were, and validation
	 * and pruning according to schema.
	 */
	private get view() {
		if (this.cachedView !== undefined) {
			return this.cachedView;
		}

		if (this.viewData.deleted) {
			return null;
		}
		// can't use invalid data - but this should be bubbled up to
		// a prune point
		const rawView = this.rawView;

		const viewIsWrongType =
			(!rawView && !isNullable(this.schema)) ||
			(this.schema.type === 'array' && !Array.isArray(rawView)) ||
			((this.schema.type === 'object' || this.schema.type === 'map') &&
				!isObject(rawView));

		if (viewIsWrongType) {
			// this will cover lists and maps, too.
			if (hasDefault(this.schema)) {
				return getDefault(this.schema);
			}
			// force null - invalid - will require parent prune
			return null as any;
		}

		this.cachedView = this.isList ? [] : {};
		assignOid(this.cachedView, this.oid);

		if (Array.isArray(rawView)) {
			const schema = getChildFieldSchema(this.schema, 0);
			if (!schema) {
				/**
				 * PRUNE - this is a prune point. we can't continue
				 * to render this data, so we'll just return [].
				 * This skips the loop.
				 */
				this.ctx.log(
					'error',
					'No child field schema for list entity.',
					this.oid,
				);
			} else {
				for (let i = 0; i < rawView.length; i++) {
					const child = this.get(i);
					if (this.childIsNull(child) && !isNullable(schema)) {
						this.ctx.log(
							'error',
							'Child missing in non-nullable field',
							this.oid,
							'index:',
							i,
						);

						// this item will be pruned.
					} else {
						this.cachedView.push(child);
					}
				}
			}
		} else if (isObject(rawView)) {
			// iterate over known properties in object-type entities;
			// for maps, we just iterate over the keys.
			const keys =
				this.schema.type === 'object'
					? Object.keys(this.schema.properties)
					: Object.keys(rawView);
			for (const key of keys) {
				const schema = getChildFieldSchema(this.schema, key);
				if (!schema) {
					/**
					 * PRUNE - this is a prune point. we can't continue
					 * to render this data. If this is a map, it will be
					 * pruned empty. Otherwise, prune moves upward.
					 *
					 * This exits the loop.
					 */
					this.ctx.log(
						'error',
						'No child field schema for object entity at key',
						key,
					);
					if (this.schema.type === 'map') {
						// it's valid to prune here if it's a map
						this.cachedView = {};
					} else {
						// otherwise prune moves upward
						this.cachedView = null;
					}
					break;
				}
				const child = this.get(key as any);
				if (this.childIsNull(child) && !isNullable(schema)) {
					this.ctx.log(
						'error',
						'Child entity is missing for non-nullable field',
						this.oid,
						'key:',
						key,
					);
					/**
					 * PRUNE - this is a prune point. we can't continue
					 * to render this data. If this is a map, we can ignore
					 * this value. Otherwise we must prune upward.
					 * This exits the loop.
					 */
					if (this.schema.type !== 'map') {
						this.cachedView = null;
						break;
					}
				} else {
					this.cachedView[key] = child;
				}
			}
		}

		return this.cachedView;
	}

	private childIsNull = (child: any) => {
		if (child instanceof Entity) {
			const childView = child.view;
			return childView === null || childView === undefined;
		}
		return child === null || child === undefined;
	};

	get uid() {
		return this.oid;
	}

	get deleted() {
		return this.viewData.deleted || this.view === null;
	}

	get invalid() {
		return !!this.validate();
	}

	get isList() {
		// have to turn TS off here as our two interfaces both implement
		// const values for this boolean.
		return (
			this.schema.type === 'array' || (Array.isArray(this.viewData.view) as any)
		);
	}

	get updatedAt() {
		return this.viewData.updatedAt;
	}

	get deepUpdatedAt() {
		if (this.cachedDeepUpdatedAt) return this.cachedDeepUpdatedAt;
		// iterate over all children and take the latest timestamp
		let latest: number | null = this.updatedAt;
		if (this.isList) {
			this.forEach((child: any) => {
				if (child instanceof Entity) {
					const childTimestamp = child.deepUpdatedAt;
					if (childTimestamp && (!latest || childTimestamp > latest)) {
						latest = childTimestamp;
					}
				}
			});
		} else {
			this.values().forEach((child) => {
				if (child instanceof Entity) {
					const childTimestamp = child.deepUpdatedAt;
					if (childTimestamp && (!latest || childTimestamp > latest)) {
						latest = childTimestamp;
					}
				}
			});
		}
		this.cachedDeepUpdatedAt = latest;
		return latest;
	}

	/**
	 * @internal - this is relevant to Verdant's system, not users.
	 *
	 * Indicates whether this document is from an outdated version
	 * of the schema - which means it cannot be used until it is upgraded.
	 */
	get isOutdatedVersion(): boolean {
		if (this.parent) return this.parent.isOutdatedVersion;
		return this.viewData.fromOlderVersion;
	}

	/**
	 * Pruning - when entities have invalid children, we 'prune' that
	 * data up to the nearest prunable point - a nullable field,
	 * or a list.
	 */
	protected validate = memoByKeys(
		() => {
			this.validationError =
				validateEntityField({
					field: this.schema,
					value: this.rawView,
					fieldPath: this.fieldPath,
					depth: 1,
				}) ?? undefined;
			return this.validationError;
		},
		() => [this.viewData],
	);

	private viewWithMappedChildren = (
		mapper: (child: Entity | EntityFile) => any,
	) => {
		const view = this.view;
		if (!view) {
			return null;
		}
		if (Array.isArray(view)) {
			const mapped = view.map((value) => {
				if (value instanceof Entity || value instanceof EntityFile) {
					return mapper(value);
				} else {
					return value;
				}
			});
			assignOid(mapped, this.oid);
			return mapped;
		} else {
			const mapped = Object.entries(view).reduce((acc, [key, value]) => {
				if (value instanceof Entity || value instanceof EntityFile) {
					acc[key as any] = mapper(value);
				} else {
					acc[key as any] = value;
				}
				return acc;
			}, {} as any);
			assignOid(mapped, this.oid);
			return mapped;
		}
	};

	/**
	 * A current snapshot of this Entity's data, including nested
	 * Entities.
	 */
	getSnapshot = (): any => {
		return this.viewWithMappedChildren((child) => child.getSnapshot());
	};

	// change management methods (internal use only)
	private addPendingOperations = (operations: Operation[]) => {
		this.ctx.log('debug', 'Entity: adding pending operations', this.oid);
		const changes = this.metadataFamily.addPendingData(operations);
		for (const change of changes) {
			this.change(change);
		}
	};

	private addConfirmedData = (data: EntityStoreEventData) => {
		this.ctx.log('debug', 'Entity: adding confirmed data', this.oid);
		const changes = this.metadataFamily.addConfirmedData(data);
		for (const change of changes) {
			this.change(change);
		}
	};

	private replaceAllData = (data: EntityStoreEventData) => {
		this.ctx.log('debug', 'Entity: replacing all data', this.oid);
		const changes = this.metadataFamily.replaceAllData(data);
		for (const change of changes) {
			this.change(change);
		}
	};

	private resetAllData = () => {
		this.ctx.log('debug', 'Entity: resetting all data', this.oid);
		this.cachedDeepUpdatedAt = null;
		this.cachedView = undefined;
		this._viewData = undefined;
		const changes = this.metadataFamily.replaceAllData({});
		for (const change of changes) {
			this.change(change);
		}
	};

	private change = (ev: EntityChange) => {
		if (ev.oid === this.oid) {
			// reset cached view
			this._viewData = undefined;
			this.cachedView = undefined;
			// chain deepChanges to parents
			this.deepChange(this, ev);
			// emit the change, it's for us
			this.ctx.log('Emitting change event', this.oid);
			this.emit('change', { isLocal: ev.isLocal });
			// for root entities, we need to go ahead and decide if we're
			// deleted or not - so queries can exclude us if we are.
			if (!this.parent) {
				// newly deleted - emit event
				if (this.deleted && !this.wasDeletedLastChange) {
					this.ctx.log('debug', 'Entity deleted', this.oid);
					this.emit('delete', { isLocal: ev.isLocal });
					this.wasDeletedLastChange = true;
				} else if (!this.deleted && this.wasDeletedLastChange) {
					this.ctx.log('debug', 'Entity restored', this.oid);
					// newly restored - emit event
					this.emit('restore', { isLocal: ev.isLocal });
					this.wasDeletedLastChange = false;
				}
			}
		} else {
			// forward it to the correct family member. if none exists
			// in cache, no one will hear it anyways.
			const other = this.entityFamily.getCached(ev.oid);
			if (other && other instanceof Entity) {
				other.change(ev);
			}
		}
	};
	protected deepChange = (target: Entity, ev: EntityChange) => {
		// reset cached deep updated at timestamp; either this
		// entity or children have changed
		this.cachedDeepUpdatedAt = null;
		// reset this flag to recompute snapshot data - children
		// or self has changed. new pruning needs to happen.
		this.cachedView = undefined;
		this.ctx.log(
			'debug',
			'Deep change detected at',
			this.oid,
			'reset cached view',
		);
		this.ctx.log('debug', 'Emitting deep change event', this.oid);
		this.emit('changeDeep', target, ev);
		this.parent?.deepChange(target, ev);
	};

	private getChild = (key: any, oid: ObjectIdentifier) => {
		const schema = getChildFieldSchema(this.schema, key);
		if (!schema) {
			throw new Error(
				`No schema for key ${String(key)} in ${JSON.stringify(this.schema)}`,
			);
		}
		return this.entityFamily.get({
			oid,
			schema,
			entityFamily: this.entityFamily,
			metadataFamily: this.metadataFamily,
			parent: this,
			ctx: this.ctx,
			files: this.files,
			fieldPath: [...this.fieldPath, key],
			patchCreator: this.patchCreator,
			events: this.events,
		});
	};

	// generic entity methods
	/**
	 * Gets a value from this Entity. If the value
	 * is an object, it will be wrapped in another
	 * Entity.
	 */
	get = <Key extends keyof KeyValue>(key: Key): KeyValue[Key] => {
		assertNotSymbol(key);

		const view = this.rawView;
		if (!view) {
			throw new Error(
				`Cannot access data at key ${key} on deleted entity ${this.oid}`,
			);
		}
		const child = view[key as any];
		const fieldSchema = getChildFieldSchema(this.schema, key);
		if (!fieldSchema) {
			throw new Error(
				`No schema for key ${String(key)} in ${JSON.stringify(this.schema)}`,
			);
		}
		if (isRef(child)) {
			if (isFileRef(child)) {
				if (fieldSchema.type !== 'file') {
					throw new Error(
						`Expected file schema for key ${String(key)}, got ${
							fieldSchema.type
						}`,
					);
				}
				const file = this.files.get(child.id, {
					downloadRemote: !!fieldSchema.downloadRemote,
				});

				// FIXME: this seems bad and inconsistent
				file.subscribe('change', () => {
					this.deepChange(this, { isLocal: false, oid: this.oid });
				});

				return file as KeyValue[Key];
			} else {
				return this.getChild(key, child.id) as KeyValue[Key];
			}
		} else {
			// if this is a Map type, a missing child is
			// just an empty spot
			if (this.schema.type === 'map' && child === undefined) {
				return undefined as KeyValue[Key];
			}
			// prune invalid primitive fields
			if (
				validateEntityField({
					field: fieldSchema,
					value: child,
					fieldPath: [...this.fieldPath, key],
					depth: 1,
					requireDefaults: true,
				})
			) {
				if (hasDefault(fieldSchema)) {
					return getDefault(fieldSchema);
				}
				if (isNullable(fieldSchema)) {
					return null as any;
				}
				return undefined as any;
			}
			return child as KeyValue[Key];
		}
	};

	/**
	 * Gets a value on this entity. If the value is not
	 * present, it will be set to the provided default
	 * and returned synchronously. This method only sets
	 * a new value once when a field is empty; subsequent
	 * calls will retrieve the created value until it is
	 * deleted.
	 *
	 * Note that this should only be called for nullable
	 * fields. If the field is not nullable, the existing
	 * value or the default value will always be returned,
	 * and the default will not be set.
	 */
	getOrSet = <Key extends keyof Init & keyof KeyValue>(
		key: Key,
		init: Init[Key],
	): KeyValue[Key] => {
		assertNotSymbol(key);
		const existing = this.get(key);
		if (existing) return existing;
		this.set(key as any, init);
		return this.get(key);
	};

	private processInputValue = (value: any, key: any) => {
		if (this.readonlyKeys.includes(key as string)) {
			throw new Error(`Cannot set readonly key ${key.toString()}`);
		}
		// disassociate incoming OIDs on values and generally break object
		// references. cloning doesn't work on files so those are
		// filtered out.
		// The goal here is to be safe about a bunch of cases that could
		// result in corrupt data, like...
		// ent1.set('objField', ent2.get('objField'))
		// or
		// var shared = { foo: 'bar' };
		// ent1.set('objField', shared);
		// ent2.set('objField', shared);
		// ... each of these would result in the same object being
		// referenced in multiple entities, which could mean introduction
		// of foreign OIDs, or one object being assigned different OIDs
		// with unexpected results.
		if (!isFile(value)) {
			value = cloneDeep(value, false);
		}
		const fieldSchema = getChildFieldSchema(this.schema, key);
		if (fieldSchema) {
			traverseCollectionFieldsAndApplyDefaults(value, fieldSchema);
			const validationError = validateEntityField({
				field: fieldSchema,
				value,
				fieldPath: [...this.fieldPath, key],
			});
			if (validationError) {
				// TODO: is it a good idea to throw an error here? a runtime error won't be that helpful,
				// but also we don't really want invalid data supplied.
				throw new Error(validationError.message);
			}
		}
		return processValueFiles(value, this.files.add);
	};

	private getDeleteMode = (key: any) => {
		if (this.readonlyKeys.includes(key)) {
			return false;
		}
		// any is always deletable, and map values
		if (this.schema.type === 'any' || this.schema.type === 'map') {
			return 'delete';
		}

		if (this.schema.type === 'object') {
			const property = this.schema.properties[key];
			if (!property) {
				// huh, the property doesn't exist. it's ok to
				// remove I suppose.
				return 'delete';
			}
			if (property.type === 'any') return 'delete';
			// map can't be nullable. should it be?
			if (property.type === 'map') return false;
			if (property.nullable) return 'null';
		}
		// no other types are deletable
		return false;
	};

	/**
	 * Returns the referent value of an item in the list, used for
	 * operations which act on items. if the item is an object,
	 * it will attempt to create an OID reference to it. If it
	 * is a primitive, it will return the primitive.
	 */
	private getItemRefValue = (item: any) => {
		if (item instanceof Entity) {
			return createRef(item.oid);
		}
		if (item instanceof EntityFile) {
			return createFileRef(item.id);
		}
		if (typeof item === 'object') {
			const itemOid = maybeGetOid(item);
			if (!itemOid || !this.entityFamily.has(itemOid)) {
				throw new Error(
					`Cannot move object ${JSON.stringify(
						item,
					)} which does not exist in this list`,
				);
			}
			return createRef(itemOid);
		} else {
			return item;
		}
	};

	set = <Key extends keyof Init>(key: Key, value: Init[Key]) => {
		assertNotSymbol(key);
		this.addPendingOperations(
			this.patchCreator.createSet(
				this.oid,
				key,
				this.processInputValue(value, key),
			),
		);
	};

	/**
	 * Returns a destructured version of this Entity, where child
	 * Entities are accessible at their respective keys.
	 */
	getAll = (): KeyValue => {
		return this.view;
	};

	delete = (key: any) => {
		if (this.isList) {
			assertNumber(key);
			this.addPendingOperations(
				this.patchCreator.createListDelete(this.oid, key),
			);
		} else {
			// the key must be deletable - i.e. optional in the schema.
			const deleteMode = this.getDeleteMode(key);
			if (!deleteMode) {
				throw new Error(
					`Cannot delete key ${key.toString()} - the property is not marked as optional in the schema.`,
				);
			}
			if (deleteMode === 'delete') {
				this.addPendingOperations(
					this.patchCreator.createRemove(this.oid, key),
				);
			} else {
				this.addPendingOperations(
					this.patchCreator.createSet(this.oid, key, null),
				);
			}
		}
	};

	// object entity methods
	keys = (): string[] => {
		if (!this.view) return [];
		return Object.keys(this.view);
	};

	entries = (): [string, Exclude<KeyValue[keyof KeyValue], undefined>][] => {
		if (!this.view) return [];
		return Object.entries(this.view);
	};

	values = (): Exclude<KeyValue[keyof KeyValue], undefined>[] => {
		if (!this.view) return [];
		return Object.values(this.view);
	};

	update = (
		data: any,
		{
			merge = true,
			replaceSubObjects = false,
		}: { replaceSubObjects?: boolean; merge?: boolean } = {},
	): void => {
		if (!merge && this.schema.type !== 'any' && this.schema.type !== 'map') {
			throw new Error(
				'Cannot use .update without merge if the field has a strict schema type. merge: false is only available on "any" or "map" types.',
			);
		}
		const changes: any = {};
		assignOid(changes, this.oid);
		for (const [key, field] of Object.entries(data)) {
			if (this.readonlyKeys.includes(key as any)) {
				throw new Error(`Cannot set readonly key ${key.toString()}`);
			}
			const fieldSchema = getChildFieldSchema(this.schema, key);
			if (fieldSchema) {
				traverseCollectionFieldsAndApplyDefaults(field, fieldSchema);
			}
			changes[key] = this.processInputValue(field, key);
		}
		this.addPendingOperations(
			this.patchCreator.createDiff(this.getSnapshot(), changes, {
				mergeUnknownObjects: !replaceSubObjects,
				defaultUndefined: merge,
			}),
		);
	};

	// array entity methods
	get length(): number {
		return this.view.length;
	}

	push = (value: ListItemInit<Init>): void => {
		this.addPendingOperations(
			this.patchCreator.createListPush(
				this.oid,
				this.processInputValue(value, this.view.length),
			),
		);
	};

	insert = (index: number, value: ListItemInit<Init>): void => {
		this.addPendingOperations(
			this.patchCreator.createListInsert(
				this.oid,
				index,
				this.processInputValue(value, index),
			),
		);
	};

	move = (from: number, to: number): void => {
		this.addPendingOperations(
			this.patchCreator.createListMoveByIndex(this.oid, from, to),
		);
	};

	moveItem = (item: ListItemValue<KeyValue>, to: number): void => {
		const itemRef = this.getItemRefValue(item);
		if (isRef(itemRef)) {
			this.addPendingOperations(
				this.patchCreator.createListMoveByRef(this.oid, itemRef, to),
			);
		} else {
			const index = this.view.indexOf(item);
			if (index === -1) {
				throw new Error(
					`Cannot move item ${JSON.stringify(
						item,
					)} which does not exist in this list`,
				);
			}
			this.move(index, to);
		}
	};

	add = (value: ListItemValue<KeyValue>): void => {
		this.addPendingOperations(
			this.patchCreator.createListAdd(
				this.oid,
				this.processInputValue(value, this.view.length),
			),
		);
	};

	removeAll = (item: ListItemValue<KeyValue>): void => {
		this.addPendingOperations(
			this.patchCreator.createListRemove(this.oid, this.getItemRefValue(item)),
		);
	};

	removeFirst = (item: ListItemValue<KeyValue>): void => {
		this.addPendingOperations(
			this.patchCreator.createListRemove(
				this.oid,
				this.getItemRefValue(item),
				'first',
			),
		);
	};

	removeLast = (item: ListItemValue<KeyValue>): void => {
		this.addPendingOperations(
			this.patchCreator.createListRemove(
				this.oid,
				this.getItemRefValue(item),
				'last',
			),
		);
	};

	// list implements an iterator which maps items to wrapped
	// versions
	[Symbol.iterator]() {
		let index = 0;
		let length = this.view?.length;
		return {
			next: () => {
				if (index < length) {
					return {
						value: this.get(index++) as ListItemValue<KeyValue>,
						done: false,
					} as const;
				}
				return {
					value: undefined,
					done: true,
				} as const;
			},
		};
	}

	map = <U>(
		callback: (value: ListItemValue<KeyValue>, index: number) => U,
	): U[] => {
		return this.view.map(callback);
	};

	filter = (
		callback: (value: ListItemValue<KeyValue>, index: number) => boolean,
	): ListItemValue<KeyValue>[] => {
		return this.view.filter(callback);
	};

	has = (value: ListItemValue<KeyValue>): boolean => {
		if (!this.isList) {
			throw new Error('has() is only available on list entities');
		}
		const itemRef = this.getItemRefValue(value);
		if (isRef(itemRef)) {
			return this.view.some((item: any) => {
				if (isRef(item)) {
					return compareRefs(item, itemRef);
				}
			});
		} else {
			return this.view.includes(value);
		}
	};

	forEach = (
		callback: (value: ListItemValue<KeyValue>, index: number) => void,
	): void => {
		this.view.forEach(callback);
	};

	some = (predicate: (value: ListItemValue<KeyValue>) => boolean): boolean => {
		return this.view.some(predicate);
	};

	every = (predicate: (value: ListItemValue<KeyValue>) => boolean): boolean => {
		return this.view.every(predicate);
	};

	find = (
		predicate: (value: ListItemValue<KeyValue>) => boolean,
	): ListItemValue<KeyValue> | undefined => {
		return this.view.find(predicate);
	};

	includes = this.has;

	// TODO: make these escape hatches unnecessary
	__getViewData__ = (oid: ObjectIdentifier, type: 'confirmed' | 'pending') => {
		return this.metadataFamily.get(oid).computeView(type === 'confirmed');
	};
	__getFamilyOids__ = () => this.metadataFamily.getAllOids();
}

function assertNotSymbol<T>(key: T): asserts key is Exclude<T, symbol> {
	if (typeof key === 'symbol') throw new Error("Symbol keys aren't supported");
}

function assertNumber(key: unknown): asserts key is number {
	if (typeof key !== 'number')
		throw new Error('Only number keys are supported in list entities');
}
