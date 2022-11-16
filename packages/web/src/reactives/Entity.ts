import {
	applyPatch,
	assignOid,
	cloneDeep,
	createRef,
	decomposeOid,
	EventSubscriber,
	isObject,
	isObjectRef,
	KeyPath,
	maybeGetOid,
	Normalized,
	NormalizedObject,
	normalizeFirstLevel,
	ObjectIdentifier,
	Operation,
	OperationPatch,
	removeOid,
	StorageFieldSchema,
	StorageFieldsSchema,
	traverseCollectionFieldsAndApplyDefaults,
} from '@lo-fi/common';
import { DocumentFamilyCache } from './DocumentFamiliyCache.js';
import { EntityStore } from './EntityStore.js';

export const ADD_OPERATIONS = '@@addOperations';
export const DELETE = '@@delete';
export const GET_STORED_SNAPSHOT = '@@storedSnapshot';
export const REBASE = '@@rebase';

interface CacheEvents {
	onSubscribed: (entity: EntityBase<any>) => void;
	onAllUnsubscribed: (entity: EntityBase<any>) => void;
}

export type AccessibleEntityProperty<T> = T extends Array<any>
	? number
	: T extends object
	? keyof T
	: never;

type DataFromInit<Init> = Init extends { [key: string]: any }
	? {
			[Key in keyof Init]-?: Init[Key];
	  }
	: Init extends Array<any>
	? Init
	: any;

export type EntityPropertyValue<
	Init,
	K extends keyof Init | number,
> = Init extends Array<any>
	? Init[K] extends Array<any>
		? ListEntity<Init[K][number]>
		: Init[K] extends object
		? ObjectEntity<Init[K]>
		: Init[K]
	: Init extends object
	? K extends keyof Init
		? Init[K] extends Array<any>
			? ListEntity<Init[K][number]>
			: Init[K] extends object
			? ObjectEntity<Init[K]>
			: Init[K]
		: never
	: never;

export type DestructuredEntity<Init> = Init extends Array<any>
	? EntityPropertyValue<Init, number>[]
	: Init extends object
	? { [K in keyof Init]: EntityPropertyValue<Init, K> }
	: never;

export type EntityShape<E extends EntityBase<any>> = E extends EntityBase<
	infer Init
>
	? Init
	: never;

export function getStoredEntitySnapshot(entity: EntityBase<any>) {
	return entity[GET_STORED_SNAPSHOT]();
}

export abstract class EntityBase<Snapshot> {
	// if current is null, the entity was deleted.
	protected _current: any | null = null;

	readonly oid: ObjectIdentifier;
	protected readonly store: EntityStore;
	protected readonly cacheEvents: CacheEvents;
	protected readonly fieldSchema;
	protected readonly keyPath;
	protected readonly cache: DocumentFamilyCache;
	protected _deleted = false;

	private cachedSnapshot: Snapshot | null = null;
	private cachedDestructure: DestructuredEntity<Snapshot> | null = null;

	protected events = new EventSubscriber<{
		change: () => void;
		delete: () => void;
		restore: () => void;
	}>();

	get subscriberCount() {
		return this.events.totalSubscriberCount();
	}

	get deleted() {
		return this._deleted;
	}

	protected get value() {
		return this._current;
	}

	constructor({
		oid,
		store,
		cacheEvents,
		fieldSchema,
		cache,
	}: {
		oid: ObjectIdentifier;
		store: EntityStore;
		cacheEvents: CacheEvents;
		fieldSchema: StorageFieldSchema | StorageFieldsSchema;
		cache: DocumentFamilyCache;
	}) {
		this.oid = oid;
		this.store = store;
		this.cacheEvents = cacheEvents;
		this.fieldSchema = fieldSchema;
		this.keyPath = decomposeOid(oid).keyPath;
		this.cache = cache;
		const { view, deleted } = this.cache.computeView(oid);
		this._current = view;
		this._deleted = deleted;
		cache.subscribe(`change:${oid}`, this.onCacheChange);
	}

	private onCacheChange = () => {
		const { view, deleted } = this.cache.computeView(this.oid);
		this._current = view;
		const restored = this._deleted && !deleted;
		this._deleted = deleted;
		this.cachedSnapshot = null;
		this.cachedDestructure = null;

		if (this._deleted) {
			this.events.emit('delete');
		} else {
			this.events.emit('change');
		}
		if (restored) {
			this.events.emit('restore');
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

	subscribe = (
		event: 'change' | 'delete' | 'restore',
		callback: () => void,
	) => {
		const unsubscribe = this.events.subscribe(event, callback);
		if (this.events.subscriberCount('change') === 1) {
			this.cacheEvents.onSubscribed(this);
		}

		return () => {
			unsubscribe();
			if (this.events.subscriberCount('change') === 0) {
				this.cacheEvents.onAllUnsubscribed(this);
			}
		};
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

	protected getSubObject = (oid: ObjectIdentifier, key: any) => {
		const fieldSchema = this.getChildFieldSchema(key);
		return this.cache.getEntity(oid, fieldSchema);
	};

	protected wrapValue = <Key extends AccessibleEntityProperty<Snapshot>>(
		value: any,
		key: Key,
	): EntityPropertyValue<Snapshot, Key> => {
		if (isObjectRef(value)) {
			const oid = value.id;
			const subObject = this.getSubObject(oid, key);
			if (subObject) {
				return subObject as EntityPropertyValue<Snapshot, Key>;
			}
			throw new Error(
				`CACHE MISS: Subobject ${oid} does not exist on ${this.oid}`,
			);
		}
		return value;
	};

	get = <Key extends AccessibleEntityProperty<Snapshot>>(
		key: Key,
	): EntityPropertyValue<Snapshot, Key> => {
		if (this.value === undefined || this.value === null) {
			throw new Error('Cannot access deleted entity');
		}

		const value = this.value[key];
		return this.wrapValue(value, key);
	};

	getAll = (): DestructuredEntity<Snapshot> => {
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
	getSnapshot = (): Snapshot | null => {
		if (!this.value) {
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
		this.cachedSnapshot = snapshot;
		return snapshot;
	};

	protected [GET_STORED_SNAPSHOT] = (): Snapshot | null => {
		if (!this._current) return null;

		let snapshot;
		if (Array.isArray(this._current)) {
			snapshot = this._current.map((item, idx) => {
				if (isObjectRef(item)) {
					return (this.getSubObject(item.id, idx) as any)?.[
						GET_STORED_SNAPSHOT
					]();
				}
				return item;
			}) as Snapshot;
		} else {
			snapshot = { ...this._current };
			for (const [key, value] of Object.entries(snapshot)) {
				if (isObjectRef(value)) {
					snapshot[key] = (this.getSubObject(value.id, key) as any)?.[
						GET_STORED_SNAPSHOT
					]();
				}
			}
		}

		assignOid(snapshot, this.oid);
		return snapshot;
	};
}

export class ListEntity<ItemInit>
	extends EntityBase<DataFromInit<ItemInit>[]>
	implements Iterable<EntityPropertyValue<DataFromInit<ItemInit>[], number>>
{
	private getItemOid = (item: DataFromInit<ItemInit>) => {
		const itemOid = maybeGetOid(item);
		if (!itemOid || !this.cache.hasOid(itemOid)) {
			throw new Error(
				`Cannot move object ${JSON.stringify(
					item,
				)} which does not exist in this list`,
			);
		}
		return itemOid;
	};

	get length() {
		return this.value.length;
	}

	set = (index: number, value: ItemInit) => {
		const fieldSchema = this.getChildFieldSchema(index);
		if (fieldSchema) {
			traverseCollectionFieldsAndApplyDefaults(value, fieldSchema);
		}
		this.addPatches(
			this.store.meta.patchCreator.createSet(
				this.oid,
				index,
				value,
				this.keyPath,
			),
		);
	};
	push = (value: ItemInit) => {
		const fieldSchema = this.getChildFieldSchema(this.value.length);
		if (fieldSchema) {
			traverseCollectionFieldsAndApplyDefaults(value, fieldSchema);
		}
		this.addPatches(
			this.store.meta.patchCreator.createListPush(this.oid, value),
		);
	};
	insert = (index: number, value: ItemInit) => {
		const fieldSchema = this.getChildFieldSchema(index);
		if (fieldSchema) {
			traverseCollectionFieldsAndApplyDefaults(value, fieldSchema);
		}
		this.addPatches(
			this.store.meta.patchCreator.createListInsert(this.oid, index, value),
		);
	};
	move = (from: number, to: number) => {
		this.addPatches(
			this.store.meta.patchCreator.createListMoveByIndex(this.oid, from, to),
		);
	};
	moveItem = (item: DataFromInit<ItemInit>, to: number) => {
		this.addPatches(
			this.store.meta.patchCreator.createListMoveByRef(
				this.oid,
				createRef(this.getItemOid(item)),
				to,
			),
		);
	};
	delete = (index: number) => {
		this.addPatches(
			this.store.meta.patchCreator.createListDelete(this.oid, index),
		);
	};
	remove = (item: DataFromInit<ItemInit>) => {
		this.addPatches(
			this.store.meta.patchCreator.createListRemove(
				this.oid,
				createRef(this.getItemOid(item)),
			),
		);
	};

	// list implements an iterator which maps items to wrapped
	// versions
	[Symbol.iterator]() {
		let index = 0;
		return {
			next: () => {
				if (index < this.value.length) {
					return {
						value: this.get(index++) as EntityPropertyValue<
							DataFromInit<ItemInit>[],
							number
						>,
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

	private getAsWrapped = (): EntityPropertyValue<
		DataFromInit<ItemInit>[],
		number
	>[] => {
		return this.value.map(this.wrapValue);
	};

	map = <U>(
		callback: (
			value: EntityPropertyValue<DataFromInit<ItemInit>[], number>,
			index: number,
		) => U,
	) => {
		return this.getAsWrapped().map(callback);
	};

	filter = (
		callback: (
			value: EntityPropertyValue<DataFromInit<ItemInit>[], number>,
			index: number,
		) => boolean,
	) => {
		return this.getAsWrapped().filter((val, index) => {
			return callback(val, index);
		});
	};
}

export class ObjectEntity<Init> extends EntityBase<DataFromInit<Init>> {
	set = <Key extends keyof Init>(key: Key, value: Init[Key]) => {
		const fieldSchema = this.getChildFieldSchema(key);
		if (fieldSchema) {
			traverseCollectionFieldsAndApplyDefaults(value, fieldSchema);
		}
		this.addPatches(
			this.store.meta.patchCreator.createSet(
				this.oid,
				key as string | number,
				value,
				this.keyPath,
			),
		);
	};
	remove = (key: string) => {
		this.addPatches(this.store.meta.patchCreator.createRemove(this.oid, key));
	};
	update = (value: Partial<DataFromInit<Init>>) => {
		this.addPatches(
			this.store.meta.patchCreator.createDiff(
				this.value,
				assignOid(value, this.oid),
				this.keyPath,
			),
		);
	};
}

export type Entity = ListEntity<any> | ObjectEntity<any>;
