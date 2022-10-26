import {
	applyPatch,
	assignOid,
	cloneDeep,
	createRef,
	EventSubscriber,
	isObject,
	isObjectRef,
	maybeGetOid,
	normalizeFirstLevel,
	ObjectIdentifier,
	Operation,
	OperationPatch,
	removeOid,
	StorageFieldSchema,
	StorageFieldsSchema,
	traverseCollectionFieldsAndApplyDefaults,
} from '@lo-fi/common';
import { EntityStore } from './EntityStore.js';

export const UPDATE = '@@update';
export const DELETE = '@@delete';

interface CacheEvents {
	onSubscribed: () => void;
	onAllUnsubscribed: () => void;
}

type AccessibleEntityProperty<T> = T extends Array<any>
	? number
	: T extends object
	? keyof T
	: never;

type DataFromInit<Init> = {
	[Key in keyof Init]-?: Init[Key];
};

type EntityPropertyValue<
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

export function updateEntity(entity: EntityBase<any>, newValue: any) {
	entity[UPDATE](newValue);
}

export function deleteEntity(entity: EntityBase<any>) {
	entity[DELETE]();
}

export abstract class EntityBase<Snapshot> {
	// if current is null, the entity was deleted.
	protected _current: any | null = null;
	// while changes are propagating, realtime alterations are set on this
	// object, which overshadows _current.
	protected _override: any | null = null;

	protected subObjectCache: Map<ObjectIdentifier, EntityBase<any>> = new Map();

	private cachedSnapshot: any | null = null;

	protected _deleted = false;

	protected events = new EventSubscriber<{
		change: () => void;
		delete: () => void;
		restore: () => void;
	}>();

	protected get value() {
		return this._override || this._current;
	}

	get deleted() {
		return this._deleted;
	}

	constructor(
		readonly oid: ObjectIdentifier,
		initial: Snapshot | undefined,
		protected readonly store: EntityStore,
		protected readonly cacheEvents: CacheEvents,
		protected readonly fieldSchema: StorageFieldSchema | StorageFieldsSchema,
	) {
		this[UPDATE](initial);
	}

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

	protected [DELETE] = () => {
		// entity was deleted
		this._current = null;
		this._override = null;
		this.cachedSnapshot = null;
		this.subObjectCache.clear();
		this._deleted = true;
		this.events.emit('delete');
	};

	protected [UPDATE] = (initial: Snapshot | undefined) => {
		const { refs, oidKeyPairs } = normalizeFirstLevel(initial);
		const self = refs.get(this.oid);
		this._current = self ? removeOid(self) : undefined;
		// update any existing sub-object values
		const droppedOids = new Set<ObjectIdentifier>();
		const newOids = new Set<ObjectIdentifier>(refs.keys());
		newOids.delete(this.oid); // remove own oid

		for (const [oid, entity] of this.subObjectCache) {
			const incomingValue = refs.get(oid);
			entity[UPDATE](incomingValue);

			// update our bookkeeping
			if (incomingValue === undefined) {
				droppedOids.add(oid);
			}
			newOids.delete(oid);
		}

		// any new keys are new sub-objects that must
		// be created
		for (const oid of newOids) {
			const value = refs.get(oid);
			const entity = this.createSubObject(oid, value, oidKeyPairs.get(oid)!);
			this.subObjectCache.set(oid, entity);
		}

		// any dropped keys are sub-objects that must be
		// removed
		for (const oid of droppedOids) {
			this.subObjectCache.delete(oid);
		}

		// clear overrides
		this._override = null;
		// reset snapshot dirty state
		this.cachedSnapshot = null;

		if (this._deleted && this._current) {
			this._deleted = false;
			this.events.emit('restore');
		}

		this.events.emit('change');
	};

	protected createSubObject = (
		oid: ObjectIdentifier,
		value: any,
		key: any,
	): EntityBase<any> => {
		if (Array.isArray(value)) {
			return new ListEntity(
				oid,
				value,
				this.store,
				this.cacheEvents,
				this.getChildFieldSchema(key),
			);
		} else {
			return new ObjectEntity(
				oid,
				value,
				this.store,
				this.cacheEvents,
				this.getChildFieldSchema(key),
			);
		}
	};

	dispose = () => {
		// TODO: implement
	};

	subscribe = (
		event: 'change' | 'delete' | 'restore',
		callback: () => void,
	) => {
		const unsubscribe = this.events.subscribe(event, callback);
		if (this.events.subscriberCount('change') === 1) {
			this.cacheEvents.onSubscribed();
		}

		return () => {
			unsubscribe();
			if (this.events.subscriberCount('change') === 0) {
				queueMicrotask(() => {
					if (this.events.subscriberCount('change') === 0) {
						this.cacheEvents.onAllUnsubscribed();
					}
				});
			}
		};
	};

	protected addPatches = (patches: Operation[]) => {
		this.store.enqueueOperations(patches);
		// immediately apply patches to _override
		this.propagateImmediateOperations(patches);
	};

	protected cloneCurrent = () => {
		if (this._current === undefined) {
			return undefined;
		}
		return cloneDeep(this._current);
	};

	/**
	 * When an entity creates patches, it applies them in-memory for
	 * immediate feedback. But not all patches will relate to its immediate
	 * root object. So entities propagate patches downwards to their
	 * sub-objects for in-memory application.
	 */
	protected propagateImmediateOperations = (operations: Operation[]) => {
		for (const patch of operations) {
			if (patch.oid === this.oid) {
				// apply it to _override
				this._override = applyPatch(
					this._override || this.cloneCurrent(),
					patch.data,
				);
			}
		}
		this.addMissingSubObjectsForMemoryChanges();

		for (const entity of this.subObjectCache.values()) {
			entity.propagateImmediateOperations(operations);
		}

		// invalidate snapshot
		this.cachedSnapshot = null;
		// inform subscribers of change
		this.events.emit('change');
	};

	/**
	 * Creates empty sub-objects for any missing object refs in
	 * children of this object according to its in-memory immediate
	 * value. This is used to prep sub-objects when applying immediate
	 * propagated changes before those sub-objects have been created
	 * and exist in storage.
	 */
	protected addMissingSubObjectsForMemoryChanges = () => {
		if (!this._override) {
			return;
		}

		if (Array.isArray(this._override)) {
			for (let i = 0; i < this._override.length; i++) {
				const value = this._override[i];
				if (isObjectRef(value) && !this.subObjectCache.has(value.id)) {
					const entity = this.createSubObject(value.id, undefined, i);
					this.subObjectCache.set(value.id, entity);
				}
			}
		} else if (isObject(this._override)) {
			for (const [key, value] of Object.entries(this._override)) {
				if (isObjectRef(value) && !this.subObjectCache.has(value.id)) {
					const entity = this.createSubObject(value.id, undefined, key);
					this.subObjectCache.set(value.id, entity);
				}
			}
		}
	};

	protected getSubObject = (oid: ObjectIdentifier) => {
		return this.subObjectCache.get(oid);
	};

	protected wrapValue = <Key extends AccessibleEntityProperty<Snapshot>>(
		value: any,
		key: Key,
	): EntityPropertyValue<Snapshot, Key> => {
		if (isObjectRef(value)) {
			const oid = value.id;
			const subObject = this.getSubObject(oid);
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
		if (this._deleted) {
			throw new Error('Cannot access deleted entity');
		}

		const value = this.value[key];
		return this.wrapValue(value, key);
	};

	/**
	 * Returns a copy of the entity and all sub-objects as
	 * a plain object or array.
	 */
	getSnapshot = (): Snapshot | null => {
		if (!this.value) {
			return null;
		}
		if (!this.cachedSnapshot) {
			if (Array.isArray(this.value)) {
				this.cachedSnapshot = this.value.map((item) => {
					if (isObjectRef(item)) {
						return this.getSubObject(item.id)?.getSnapshot();
					}
					return item;
				}) as Snapshot;
			} else {
				const snapshot = { ...this.value };
				for (const [key, value] of Object.entries(snapshot)) {
					if (isObjectRef(value)) {
						snapshot[key] = this.getSubObject(value.id)?.getSnapshot();
					}
				}
				this.cachedSnapshot = snapshot as Snapshot;
			}
		}
		return this.cachedSnapshot;
	};
}

export class ListEntity<ItemInit>
	extends EntityBase<DataFromInit<ItemInit>[]>
	implements Iterable<EntityPropertyValue<DataFromInit<ItemInit>[], number>>
{
	private getItemOid = (item: DataFromInit<ItemInit>) => {
		const itemOid = maybeGetOid(item);
		if (!itemOid || !this.subObjectCache.has(itemOid)) {
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
			this.store.meta.patchCreator.createSet(this.oid, index, value),
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
			),
		);
	};
}

export type Entity = ListEntity<any> | ObjectEntity<any>;

export type EntityShape<E extends EntityBase<any>> = E extends ListEntity<
	infer T
>
	? T[]
	: E extends ObjectEntity<infer T>
	? T
	: never;
