import {
	assert,
	assignOid,
	cloneDeep,
	createRef,
	decomposeOid,
	EventSubscriber,
	FileData,
	isFileRef,
	isObjectRef,
	maybeGetOid,
	ObjectIdentifier,
	Operation,
	PatchCreator,
	StorageFieldSchema,
	StorageFieldsSchema,
	TimestampProvider,
	traverseCollectionFieldsAndApplyDefaults,
} from '@verdant-web/common';
import { EntityFile } from '../files/EntityFile.js';
import { processValueFiles } from '../files/utils.js';
import { WeakRef } from './FakeWeakRef.js';

export const ADD_OPERATIONS = '@@addOperations';
export const DELETE = '@@delete';
export const REBASE = '@@rebase';
const REFRESH = '@@refresh';
export const DEEP_CHANGE = '@@deepChange';

export interface CacheTools {
	computeView(oid: ObjectIdentifier): {
		view: any;
		deleted: boolean;
		lastTimestamp: number | null;
	};
	getEntity(
		oid: ObjectIdentifier,
		schema: StorageFieldSchema,
		parent?: Entity,
	): Entity;
	hasOid(oid: ObjectIdentifier): boolean;
}

export interface StoreTools {
	addLocalOperations(operations: Operation[]): void;
	patchCreator: PatchCreator;
	addFile: (file: FileData) => void;
	getFile: (id: string) => EntityFile;
	time: TimestampProvider;
	now: string;
}

export type AccessibleEntityProperty<T> = T extends Array<any>
	? number
	: T extends object
	? keyof T
	: never;

type DataFromInit<Init> = Init extends { [key: string]: any }
	? {
			[Key in keyof Init]: Init[Key];
	  }
	: Init extends Array<any>
	? Init
	: any;

export type EntityShape<E extends Entity<any, any>> = E extends Entity<
	infer Value,
	any
>
	? Value
	: never;

// reduces keys of an object to only ones with an optional
// value
type DeletableKeys<T> = keyof {
	[Key in keyof T as IfNullableThen<T[Key], Key>]: Key;
};
type IfNullableThen<T, Out> = undefined extends T
	? Out
	: null extends T
	? Out
	: never;

export function refreshEntity(
	entity: Entity<any, any>,
	info: EntityChangeInfo,
) {
	return entity[REFRESH](info);
}

export interface EntityChangeInfo {
	isLocal?: boolean;
}

type EntityEvents = {
	change: (info: EntityChangeInfo) => void;
	changeDeep: (target: Entity<any, any>, info: EntityChangeInfo) => void;
	delete: (info: EntityChangeInfo) => void;
	restore: (info: EntityChangeInfo) => void;
};

type BaseEntityValue = { [Key: string]: any } | any[];

export class Entity<
	Init = any,
	KeyValue extends BaseEntityValue = any,
	Snapshot extends any = DataFromInit<Init>,
> implements
		ObjectEntity<Init, KeyValue, Snapshot>,
		ListEntity<Init, KeyValue, Snapshot>
{
	// if current is null, the entity was deleted.
	protected _current: any | null = null;

	readonly oid: ObjectIdentifier;
	readonly collection: string;
	protected readonly store: StoreTools;
	protected readonly fieldSchema;
	protected readonly cache: CacheTools;
	protected _deleted = false;
	protected parent: WeakRef<Entity<any, any>> | undefined;

	private cachedSnapshot: any = null;
	private cachedDestructure: KeyValue | null = null;
	private cachedDeepUpdatedAt: number | null = null;

	private _updatedAt: number | null = null;

	protected events;

	protected hasSubscribersToDeepChanges() {
		return this.events.subscriberCount('changeDeep') > 0;
	}

	get hasSubscribers() {
		if (this.events.totalSubscriberCount() > 0) {
			return true;
		}

		// even if nobody subscribes directly to this entity, if a parent
		// has a deep subscription that counts.
		let parent = this.parent?.deref();
		while (parent) {
			if (parent.hasSubscribersToDeepChanges()) {
				return true;
			}
			parent = parent.parent?.deref();
		}

		return false;
	}

	get deleted() {
		return this._deleted;
	}

	protected get value() {
		return this._current;
	}

	get isList() {
		return Array.isArray(this._current) as any;
	}

	get updatedAt() {
		return this._updatedAt;
	}

	get deepUpdatedAt() {
		if (this.cachedDeepUpdatedAt) return this.cachedDeepUpdatedAt;
		// iterate over all children and take the latest timestamp
		let latest: number | null = this._updatedAt;
		if (this.isList) {
			this.forEach((child) => {
				if ((child as any) instanceof Entity) {
					const childTimestamp = child.deepUpdatedAt;
					if (childTimestamp && (!latest || childTimestamp > latest)) {
						latest = childTimestamp;
					}
				}
			});
		} else {
			this.values().forEach((child) => {
				if ((child as any) instanceof Entity) {
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

	get uid() {
		return this.oid;
	}

	constructor({
		oid,
		store,
		fieldSchema,
		cache,
		parent,
		onAllUnsubscribed,
	}: {
		oid: ObjectIdentifier;
		store: StoreTools;
		fieldSchema: StorageFieldSchema | StorageFieldsSchema;
		cache: CacheTools;
		parent?: Entity<any, any>;
		onAllUnsubscribed?: () => void;
	}) {
		this.oid = oid;
		const { collection } = decomposeOid(oid);
		this.collection = collection;
		this.parent = parent && new WeakRef(parent);
		this.store = store;
		this.fieldSchema = fieldSchema;
		this.cache = cache;
		const { view, deleted, lastTimestamp } = this.cache.computeView(oid);
		this._current = view;
		this._deleted = deleted;
		this._updatedAt = lastTimestamp ? lastTimestamp : null;
		this.cachedDeepUpdatedAt = null;
		this.events = new EventSubscriber<EntityEvents>(() => {
			if (!this.hasSubscribers) {
				onAllUnsubscribed?.();
			}
		});

		if (this.oid.includes('.') && !this.parent) {
			throw new Error('Parent must be provided for sub entities');
		}
		assert(!!fieldSchema, 'Field schema must be provided');
	}

	private [REFRESH] = (info: EntityChangeInfo) => {
		const { view, deleted, lastTimestamp } = this.cache.computeView(this.oid);
		this._current = view;
		const restored = this._deleted && !deleted;
		this._deleted = deleted;
		this.cachedDestructure = null;
		this._updatedAt = lastTimestamp ? lastTimestamp : null;
		this.cachedDeepUpdatedAt = null;

		if (this._deleted) {
			this.events.emit('delete', info);
		} else {
			this.events.emit('change', info);
			this[DEEP_CHANGE](this as unknown as Entity<any, any>, info);
		}
		if (restored) {
			this.cachedSnapshot = null;
			this.events.emit('restore', info);
		}
	};

	private [DEEP_CHANGE] = (
		source: Entity<any, any>,
		info: EntityChangeInfo,
	) => {
		this.cachedSnapshot = null;
		this.cachedDeepUpdatedAt = null;
		this.events.emit('changeDeep', source, info);
		const parent = this.parent?.deref();
		if (parent) {
			parent[DEEP_CHANGE](source, info);
		}
	};

	protected getChildFieldSchema = (key: any) => {
		if (this.fieldSchema.type === 'object') {
			return this.fieldSchema.properties[key];
		} else if (this.fieldSchema.type === 'array') {
			return this.fieldSchema.items;
		} else if (this.fieldSchema.type === 'map') {
			return this.fieldSchema.values;
		} else if (this.fieldSchema.type === 'any') {
			return this.fieldSchema;
		}
		throw new Error('Invalid field schema');
	};

	dispose = () => {
		this.events.dispose();
	};

	subscribe = <EventName extends keyof EntityEvents>(
		event: EventName,
		callback: EntityEvents[EventName],
	) => {
		const unsubscribe = this.events.subscribe(event, callback);

		return unsubscribe;
	};

	protected addPatches = (patches: Operation[]) => {
		this.store.addLocalOperations(patches);
	};

	protected cloneCurrent = () => {
		if (this._current === undefined) {
			return undefined;
		}
		return cloneDeep(this._current);
	};

	protected getSubObject = (
		oid: ObjectIdentifier,
		key: any,
	): Entity<any, any> => {
		const fieldSchema = this.getChildFieldSchema(key);
		// this is a failure case, but trying to be graceful about it...
		// @ts-ignore
		// if (!fieldSchema) return null;
		return this.cache.getEntity(oid, fieldSchema, this);
	};

	protected wrapValue = <Key extends keyof KeyValue>(
		value: any,
		key: Key,
	): KeyValue[Key] => {
		if (isObjectRef(value)) {
			const oid = value.id;
			const subObject = this.getSubObject(oid, key);
			if (subObject) {
				return subObject as any;
			}
			throw new Error(
				`CACHE MISS: Subobject ${oid} does not exist on ${this.oid}`,
			);
		} else if (isFileRef(value)) {
			const file = this.store.getFile(value.id);
			if (file) {
				file.subscribe('change', () => {
					this[DEEP_CHANGE](this, {
						isLocal: false,
					});
				});
				return file as any;
			}
		}
		return value;
	};

	protected processInputValue = (value: any, key: any) => {
		const fieldSchema = this.getChildFieldSchema(key);
		if (fieldSchema) {
			traverseCollectionFieldsAndApplyDefaults(value, fieldSchema);
		}
		return processValueFiles(value, this.store.addFile);
	};

	get = <Key extends keyof KeyValue>(key: Key): KeyValue[Key] => {
		if (this.value === undefined || this.value === null) {
			throw new Error('Cannot access deleted entity');
		}

		const value = this.value[key];
		return this.wrapValue(value, key);
	};

	getAll = (): KeyValue => {
		if (this.value === undefined || this.value === null) {
			throw new Error('Cannot access deleted entity');
		}

		if (this.cachedDestructure) return this.cachedDestructure;

		let result: any;
		if (Array.isArray(this.value)) {
			result = this.value.map((value, index) =>
				this.wrapValue(value, index as any),
			) as any;
		} else {
			result = {} as any;
			for (const key in this.value) {
				result[key as any] = this.get(key as any);
			}
		}
		this.cachedDestructure = result;
		return result;
	};

	/**
	 * Returns a copy of the entity and all sub-objects as
	 * a plain object or array.
	 */
	getSnapshot = (): any => {
		if (!this.value) {
			return null;
		}
		if (this.deleted) {
			return null;
		}
		if (this.cachedSnapshot) {
			return this.cachedSnapshot;
		}
		let snapshot;
		if (Array.isArray(this.value)) {
			snapshot = this.value.map((item, idx) => {
				if (isObjectRef(item)) {
					return this.getSubObject(item.id, idx)?.getSnapshot();
				}
				return item;
			}) as Snapshot;
		} else {
			snapshot = { ...this.value };
			for (const [key, value] of Object.entries(snapshot)) {
				if (isObjectRef(value)) {
					snapshot[key] = this.getSubObject(value.id, key)?.getSnapshot();
				}
			}
		}

		assignOid(snapshot, this.oid);
		this.cachedSnapshot = snapshot;
		return snapshot;
	};

	/**
	 * Object methods
	 */
	keys = () => {
		return Object.keys(this.value || {});
	};
	entries = () => {
		return Object.entries(this.getAll());
	};
	values = () => {
		return Object.values(this.getAll());
	};
	set = <Key extends keyof Init>(key: Key, value: Init[Key]) => {
		this.addPatches(
			this.store.patchCreator.createSet(
				this.oid,
				key as string | number,
				this.processInputValue(value, key),
			),
		);
	};
	delete = (key: any) => {
		if (Array.isArray(this.value)) {
			this.addPatches(
				this.store.patchCreator.createListDelete(this.oid, key as number, 1),
			);
		} else {
			// the key must be deletable - i.e. optional in the schema
			const deleteMode = this.getDeleteMode(key);
			if (!deleteMode) {
				throw new Error(
					`Cannot delete key ${key} - the property is not marked as optional in the schema`,
				);
			}
			if (deleteMode === 'delete') {
				this.addPatches(this.store.patchCreator.createRemove(this.oid, key));
			} else {
				this.addPatches(this.store.patchCreator.createSet(this.oid, key, null));
			}
		}
	};
	private getDeleteMode = (key: any) => {
		// 'any' is always deletable, and map values can be removed completely
		if (this.fieldSchema.type === 'any' || this.fieldSchema.type === 'map') {
			return 'delete';
		}

		if (this.fieldSchema.type === 'object') {
			const property = this.fieldSchema.properties[key];
			if (!property) {
				// huh, trying to delete a field that isn't specified
				// in the schema. we should use 'delete' mode.
				return 'delete';
			}
			if (property.type === 'any') return 'delete';
			// map can't be nullable
			// TODO: should it be?
			if (property.type === 'map') return false;
			// nullable properties can only be set null
			if (property.nullable) return 'null';
		}
		// no other parent objects support deleting
		return false;
	};
	/** @deprecated - renamed to delete */
	remove = this.delete.bind(this);

	update = (
		value: Partial<Snapshot>,
		{
			replaceSubObjects = false,
			merge = true,
		}: { replaceSubObjects?: boolean; merge?: boolean } = {
			/**
			 * If true, merged sub-objects will be replaced entirely if there's
			 * ambiguity about their identity.
			 */
			replaceSubObjects: false,
			/**
			 * If false, omitted keys will erase their respective fields.
			 */
			merge: true,
		},
	) => {
		if (
			!merge &&
			this.fieldSchema.type !== 'any' &&
			this.fieldSchema.type !== 'map'
		) {
			throw new Error(
				'Cannot use .update without merge if the field has a strict schema type. merge: false is only available on "any" or "map" types.',
			);
		}
		for (const [key, field] of Object.entries(value)) {
			const fieldSchema = this.getChildFieldSchema(key);
			if (fieldSchema) {
				traverseCollectionFieldsAndApplyDefaults(field, fieldSchema);
			}
		}
		const withoutFiles = processValueFiles(value, this.store.addFile);
		this.addPatches(
			this.store.patchCreator.createDiff(
				this.getSnapshot(),
				assignOid(withoutFiles, this.oid),
				{
					mergeUnknownObjects: !replaceSubObjects,
					defaultUndefined: merge,
				},
			),
		);
	};

	/**
	 * List methods
	 */

	/**
	 * Returns the referent value of an item in the list, used for
	 * operations which act on items. if the item is an object,
	 * it will attempt to create an OID reference to it. If it
	 * is a primitive, it will return the primitive.
	 */
	private getItemRefValue = (item: ListItemValue<KeyValue>) => {
		if (typeof item === 'object') {
			const itemOid = maybeGetOid(item);
			if (!itemOid || !this.cache.hasOid(itemOid)) {
				throw new Error(
					`Cannot move object ${JSON.stringify(
						item,
					)} which does not exist in this list`,
				);
			}
			return itemOid;
		} else {
			return item;
		}
	};

	get length() {
		return this.value.length;
	}

	push = (value: ListItemInit<Init>) => {
		this.addPatches(
			this.store.patchCreator.createListPush(
				this.oid,
				this.processInputValue(value, this.value.length),
			),
		);
	};
	insert = (index: number, value: ListItemInit<Init>) => {
		this.addPatches(
			this.store.patchCreator.createListInsert(
				this.oid,
				index,
				this.processInputValue(value, index),
			),
		);
	};
	move = (from: number, to: number) => {
		this.addPatches(
			this.store.patchCreator.createListMoveByIndex(this.oid, from, to),
		);
	};
	moveItem = (item: ListItemValue<KeyValue>, to: number) => {
		const itemRef = this.getItemRefValue(item);
		if (isObjectRef(itemRef)) {
			this.addPatches(
				this.store.patchCreator.createListMoveByRef(this.oid, itemRef, to),
			);
		} else {
			const index = this.value.indexOf(itemRef);
			this.addPatches(
				this.store.patchCreator.createListMoveByIndex(this.oid, index, to),
			);
		}
	};
	removeAll = (item: ListItemValue<KeyValue>) => {
		this.addPatches(
			this.store.patchCreator.createListRemove(
				this.oid,
				this.getItemRefValue(item),
			),
		);
	};
	removeFirst = (item: ListItemValue<KeyValue>) => {
		this.addPatches(
			this.store.patchCreator.createListRemove(
				this.oid,
				this.getItemRefValue(item),
				'first',
			),
		);
	};
	removeLast = (item: ListItemValue<KeyValue>) => {
		this.addPatches(
			this.store.patchCreator.createListRemove(
				this.oid,
				this.getItemRefValue(item),
				'last',
			),
		);
	};
	add = (item: ListItemValue<KeyValue>) => {
		this.addPatches(
			this.store.patchCreator.createListAdd(
				this.oid,
				this.processInputValue(item, this.value.length),
			),
		);
	};
	has = (item: ListItemValue<KeyValue>) => {
		if (typeof item === 'object') {
			return this.value.some((val: unknown) => {
				if (isObjectRef(val)) return val.id === maybeGetOid(item);
				// Sets of files don't work right now, there's no way to compare them
				// effectively.
				if (isFileRef(val)) return false;
				return false;
			});
		}
		return this.value.includes(item);
	};

	// list implements an iterator which maps items to wrapped
	// versions
	[Symbol.iterator]() {
		let index = 0;
		return {
			next: () => {
				if (index < this.value.length) {
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

	// additional access methods

	private getAsWrapped = (): ListItemValue<KeyValue>[] => {
		if (!this.isList) throw new Error('Cannot map items of a non-list');
		return this.value.map(this.wrapValue);
	};

	map = <U>(callback: (value: ListItemValue<KeyValue>, index: number) => U) => {
		return this.getAsWrapped().map(callback);
	};

	filter = (
		callback: (value: ListItemValue<KeyValue>, index: number) => boolean,
	) => {
		return this.getAsWrapped().filter((val, index) => {
			return callback(val, index);
		});
	};

	forEach = (
		callback: (value: ListItemValue<KeyValue>, index: number) => void,
	) => {
		this.getAsWrapped().forEach(callback);
	};

	some = (predicate: (value: ListItemValue<KeyValue>) => boolean) => {
		return this.getAsWrapped().some(predicate);
	};

	every = (predicate: (value: ListItemValue<KeyValue>) => boolean) => {
		return this.getAsWrapped().every(predicate);
	};

	find = (predicate: (value: ListItemValue<KeyValue>) => boolean) => {
		return this.getAsWrapped().find(predicate);
	};
}

export interface BaseEntity<
	Init,
	Value extends BaseEntityValue,
	Snapshot = DataFromInit<Init>,
> {
	dispose: () => void;
	subscribe<EventName extends keyof EntityEvents>(
		event: EventName,
		callback: EntityEvents[EventName],
	): () => void;
	get<Key extends keyof Value>(key: Key): Value[Key];
	getAll(): Value;
	getSnapshot(): Snapshot;
	readonly deleted: boolean;
	readonly hasSubscribers: boolean;
}

export interface ObjectEntity<
	Init,
	Value extends BaseEntityValue,
	Snapshot = DataFromInit<Init>,
> extends BaseEntity<Init, Value, Snapshot> {
	keys(): string[];
	entries(): [string, Exclude<Value[keyof Value], undefined>][];
	values(): Exclude<Value[keyof Value], undefined>[];
	set<Key extends keyof Init>(key: Key, value: Init[Key]): void;
	delete(key: DeletableKeys<Value>): void;
	update(
		value: Partial<Snapshot>,
		options?: { replaceSubObjects?: boolean; merge?: boolean },
	): void;
	readonly isList: false;
}

export interface ListEntity<
	Init,
	Value extends BaseEntityValue,
	Snapshot = DataFromInit<Init>,
> extends Iterable<ListItemValue<Value>>,
		BaseEntity<Init, Value, Snapshot> {
	readonly isList: true;
	readonly length: number;
	push(value: ListItemInit<Init>): void;
	insert(index: number, value: ListItemInit<Init>): void;
	move(from: number, to: number): void;
	moveItem(item: ListItemValue<Value>, to: number): void;
	/**
	 * A Set operation which adds a value if an equivalent value is not already present.
	 * Object values are never the same.
	 */
	add(value: ListItemValue<Value>): void;
	removeAll(item: ListItemValue<Value>): void;
	removeFirst(item: ListItemValue<Value>): void;
	removeLast(item: ListItemValue<Value>): void;
	map<U>(callback: (value: ListItemValue<Value>, index: number) => U): U[];
	filter(
		callback: (value: ListItemValue<Value>, index: number) => boolean,
	): ListItemValue<Value>[];
	delete(index: number): void;
	has(value: ListItemValue<Value>): boolean;
	forEach(callback: (value: ListItemValue<Value>, index: number) => void): void;
	some(predicate: (value: ListItemValue<Value>) => boolean): boolean;
	every(predicate: (value: ListItemValue<Value>) => boolean): boolean;
	find(
		predicate: (value: ListItemValue<Value>) => boolean,
	): ListItemValue<Value> | undefined;
}

export type AnyEntity<
	Init,
	KeyValue extends BaseEntityValue,
	Snapshot extends any,
> =
	| ListEntity<Init, KeyValue, Snapshot>
	| ObjectEntity<Init, KeyValue, Snapshot>;

type ListItemValue<KeyValue> = KeyValue extends Array<infer T> ? T : never;
type ListItemInit<Init> = Init extends Array<infer T> ? T : never;

export type EntityDestructured<T extends AnyEntity<any, any, any> | null> =
	| (T extends ListEntity<any, infer KeyValue, any>
			? KeyValue
			: T extends ObjectEntity<any, infer KeyValue, any>
			? KeyValue
			: never)
	| (T extends null ? null : never);
