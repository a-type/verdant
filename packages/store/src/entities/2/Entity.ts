import {
	EventSubscriber,
	ObjectIdentifier,
	StorageFieldSchema,
	StorageFieldsSchema,
	getChildFieldSchema,
	getOid,
	isObject,
	validateEntity,
} from '@verdant-web/common';
import {
	ObjectEntity,
	ListEntity,
	BaseEntityValue,
	DataFromInit,
	EntityChange,
	EntityEvents,
	EntityDataTree,
	DeletableKeys,
	DeepPartial,
	ListItemInit,
	ListItemValue,
} from './types.js';
import { EntityCache } from './EntityCache.js';
import { EntityMetadata } from './EntityMetadata.js';
import { Context } from '../../context.js';

export interface EntityInit {
	oid: ObjectIdentifier;
	tree: EntityDataTree;
	snapshot: any;
	schema: StorageFieldSchema | StorageFieldsSchema;
	familyCache?: EntityCache;
	parent?: Entity;
	ctx: Context;
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
	private familyCache;
	private tree: EntityDataTree;
	private _deleted = false;
	private schema;
	private parent;
	private metadata;

	constructor({
		tree,
		oid,
		schema,
		familyCache: childCache,
		parent,
		snapshot,
		ctx,
	}: EntityInit) {
		super();

		this.oid = oid;
		this.tree = tree;
		this.snapshot = snapshot;
		this.schema = schema;
		this.familyCache = childCache || new EntityCache();
		this.parent = parent;

		this.metadata = new EntityMetadata({
			oid,
			ctx,
		});

		if (!parent) {
			// this is the root document.
			// validate the data against the schema before
			// proceeding.
			const validationProblem = validateEntity(
				schema as StorageFieldsSchema,
				snapshot,
			);
			// if the data isn't valid, this entity can't be used.
			// this is not necessarily an error. we may have
			// received this entity from a replica which is
			// still using an old schema after migrating our own
			// data, which leaves this document in an invalid state
			// until that creator replica is updated.
			if (validationProblem) {
				this._deleted = true;
			}
		}
	}

	// various properties
	get deleted() {
		return this._deleted;
	}

	get isList() {
		// have to turn TS off here as our two interfaces both implement
		// const values for this boolean.
		return (
			this.schema.type === 'array' || (Array.isArray(this.getSnapshot()) as any)
		);
	}

	/**
	 * A current snapshot of this Entity's data.
	 */
	getSnapshot = () => {
		const { view } = this.metadata.computeView();
	};

	// change management methods (internal use only)
	change = (ev: EntityChange) => {
		if (ev.oid === this.oid) {
			// emit the change, it's for us
			this.emit('change', { isLocal: ev.isLocal });
			// chain deepChanges to parents
			this.deepChange(this, ev);
		} else {
			// forward it to the correct family member. if none exists
			// in cache, no one will hear it anyways.
			this.familyCache.getCached(ev.oid)?.change(ev);
		}
	};
	deepChange = (target: Entity, ev: EntityChange) => {
		this.emit('changeDeep', target, ev);
		this.parent?.deepChange(target, ev);
	};

	// generic entity methods
	/**
	 * Gets a value from this Entity. If the value
	 * is an object, it will be wrapped in another
	 * Entity.
	 */
	get = <Key extends keyof KeyValue>(key: Key) => {
		const subtree = this.tree.snapshot[key as any];
		if (typeof subtree === 'object' && subtree !== null) {
			if (typeof key === 'symbol')
				throw new Error("Symbol keys aren't supported");
			const schema = getChildFieldSchema(this.schema, key);
			if (!schema) {
				throw new Error(`No schema for key ${String(key)}`);
			}
			return this.familyCache.get({
				tree: subtree,
				oid: subtree.oid,
				schema,
				familyCache: this.familyCache,
				parent: this,
			}) as KeyValue[Key];
		} else if (typeof subtree !== 'object') {
			return subtree as KeyValue[Key];
		} else {
			// huh, non-child object snapshot?
			throw new Error('Unexpected object snapshot with no OID');
		}
	};

	set = <Key extends keyof KeyValue>(key: Key, value: KeyValue[Key]) => {
		// TODO:
	};

	getAll = (): KeyValue => {
		// TODO:
	};

	delete = <Key extends DeletableKeys<KeyValue>>(key: Key) => {
		// TODO:
	};

	// object entity methods
	keys = (): string[] => {
		// TODO:
	};

	entries = (): [string, Exclude<KeyValue[keyof KeyValue], undefined>][] => {
		// TODO:
	};

	values = (): Exclude<KeyValue[keyof KeyValue], undefined>[] => {
		// TODO:
	};

	update = (
		data: DeepPartial<Init>,
		options?: { replaceSubObjects?: boolean; merge?: boolean },
	): void => {
		// TODO:
	};

	// array entity methods
	get length(): number {
		// TODO:
	}

	push = (value: ListItemInit<Init>): void => {
		// TODO:
	};

	insert = (index: number, value: ListItemInit<Init>): void => {
		// TODO:
	};

	move = (from: number, to: number): void => {
		// TODO:
	};

	moveItem = (item: ListItemValue<KeyValue>, to: number): void => {
		// TODO:
	};

	add = (value: ListItemValue<KeyValue>): void => {
		// TODO:
	};

	removeAll = (item: ListItemValue<KeyValue>): void => {
		// TODO:
	};

	removeFirst = (item: ListItemValue<KeyValue>): void => {
		// TODO:
	};

	removeLast = (item: ListItemValue<KeyValue>): void => {
		// TODO:
	};

	map = <U>(
		callback: (value: ListItemValue<KeyValue>, index: number) => U,
	): U[] => {
		// TODO:
	};

	filter = (
		callback: (value: ListItemValue<KeyValue>, index: number) => boolean,
	): ListItemValue<KeyValue>[] => {
		// TODO:
	};

	has = (value: ListItemValue<KeyValue>): boolean => {
		// TODO:
	};

	forEach = (
		callback: (value: ListItemValue<KeyValue>, index: number) => void,
	): void => {
		// TODO:
	};

	some = (predicate: (value: ListItemValue<KeyValue>) => boolean): boolean => {
		// TODO:
	};

	every = (predicate: (value: ListItemValue<KeyValue>) => boolean): boolean => {
		// TODO:
	};

	find = (
		predicate: (value: ListItemValue<KeyValue>) => boolean,
	): ListItemValue<KeyValue> | undefined => {
		// TODO:
	};

	includes = this.has;
}
