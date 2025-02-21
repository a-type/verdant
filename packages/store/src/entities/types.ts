import { ObjectIdentifier, StorageFieldSchema } from '@verdant-web/common';
import type { Entity } from './Entity.js';

export type AccessibleEntityProperty<T> =
	T extends Array<any> ? number : T extends object ? keyof T : never;

export type DataFromInit<Init> = Init extends { [key: string]: any }
	? {
			[Key in keyof Init]: Init[Key];
		}
	: Init extends Array<any>
		? Init
		: any;

// reduces keys of an object to only ones with an optional
// value
export type DeletableKeys<T> = keyof {
	[Key in keyof T as IfNullableThen<T[Key], Key>]: Key;
};
type IfNullableThen<T, Out> = undefined extends T
	? Out
	: null extends T
		? Out
		: never;

export type EntityShape<E extends Entity<any, any>> =
	E extends Entity<infer Value, any> ? Value : never;

export type BaseEntityValue = { [Key: string]: any } | any[];

export interface EntityChange {
	oid: ObjectIdentifier;
	isLocal: boolean;
}

export interface EntityChangeInfo {
	isLocal?: boolean;
}

export type EntityEvents = {
	change: (info: EntityChangeInfo) => void;
	changeDeep: (
		target: BaseEntity<any, any, any>,
		info: EntityChangeInfo,
	) => void;
	delete: (info: EntityChangeInfo) => void;
	restore: (info: EntityChangeInfo) => void;
};

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
	subscribeToField<FieldName extends keyof Value>(
		field: FieldName,
		event: 'change',
		callback: (
			value: Value[FieldName],
			info: EntityChangeInfo & { previousValue: Value[FieldName] },
		) => void,
	): () => void;
	get<Key extends keyof Value>(key: Key): Value[Key];
	/**
	 * Returns a plain object or array containing sub-Entities and their data.
	 * Equivalent to "destructuring" the entity. Unlike getSnapshot, sub-level
	 * data is still reactive.
	 */
	getAll(): Readonly<Value>;
	/**
	 * Returns a plain Javascript object representing the current state of the entity.
	 */
	getSnapshot(): Snapshot;
	/**
	 * Returns the schema for the entity as specified in your Verdant schema.
	 * For root Documents, this will be an Object schema with properties
	 * representing each field in the document.
	 */
	readonly schema: StorageFieldSchema;
	/**
	 * Returns the schema for a field in the entity as specified in
	 * your Verdant schema.
	 */
	getFieldSchema<FieldName extends keyof Value>(
		key: FieldName,
	): StorageFieldSchema;
	/**
	 * Will be marked true after an entity has been deleted. Any attempt to
	 * access the entity's data will result in an error.
	 */
	readonly deleted: boolean;
	/**
	 * A Unix Epoch timestamp representing the last time this entity was updated.
	 */
	readonly updatedAt: number;
	/**
	 * A Unix Epoch timestamp representing the last time this entity or any of its
	 * sub-entities were updated.
	 *
	 * NOTE: reading this property requires a bit of computation, but the result
	 * is cached. If an entity is being frequently updated and this is frequently
	 * read, it may result in mild performance degradation.
	 */
	readonly deepUpdatedAt: number;
	/** A unique, opaque key for this Entity in the system. */
	readonly uid: string;
	/** If true, this Entity has authorization rules applied to it. */
	readonly isAuthorized: boolean;
	/** The authorization configuration string applied to this entity. */
	readonly access: string | undefined;
	readonly invalid: boolean;
	/** The Verdant store namespace which contains this object */
	readonly namespace: string;
}

export type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
		}
	: T;

export interface ObjectEntity<
	Init,
	Value extends BaseEntityValue,
	Snapshot = DataFromInit<Init>,
> extends BaseEntity<Init, Value, Snapshot> {
	keys(): string[];
	readonly size: number;
	entries(): [string, Exclude<Value[keyof Value], undefined>][];
	values(): Exclude<Value[keyof Value], undefined>[];
	set<Key extends keyof Init>(
		key: Key,
		value: Init[Key],
		options?: { force?: boolean },
	): void;
	delete(key: DeletableKeys<Value>): void;
	update(
		value: DeepPartial<Init>,
		options?: {
			/**
			 * Forces the replacement of sub-objects in the update payload - rather than
			 * Verdant keeping their identities intact and merging changes, your update
			 * will replace these objects entirely, overwriting any other changes from other
			 * sources.
			 *
			 * Useful when the update you're making is logically replacing sub-objects, rather
			 * than simply modifying them.
			 *
			 * Default: false
			 */
			replaceSubObjects?: boolean;
			/**
			 * If set to false, this will drop any keys in the object which were
			 * not provided in your update payload, while also merging the ones that
			 * were. This option only works for `map` and `any` type fields; you cannot
			 * use it with defined `object` type fields.
			 *
			 * Default: true
			 */
			merge?: boolean;
			/**
			 * If set to true, bypasses the restrictions around merge: false for
			 * object fields. This means you can accidentally erase required fields
			 * on this object or a sub-object. Unless you are certain your passed
			 * data conforms to the expected schema, you should not use this option.
			 */
			dangerouslyDisableMerge?: boolean;
		},
	): void;
	/**
	 * Deletes the entity from either its parent (if it's a nested value)
	 * or the database itself. WARNING: this method is tricky. It will
	 * throw an error on nested fields which are not deletable in the
	 * schema. Deleting any entity and then attempting to access its
	 * data will also result in an error.
	 *
	 * Prefer using client.<collection>.delete(id) instead.
	 */
	deleteSelf(): void;
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
	set(
		index: number,
		value: ListItemInit<Init>,
		options?: { force?: boolean },
	): void;
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
	reduce<U>(
		callback: (
			accumulator: U,
			currentValue: ListItemValue<Value>,
			index: number,
		) => U,
		initialValue: U,
	): U;
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
	includes(value: ListItemValue<Value>): boolean;
}

export type AnyEntity<
	Init,
	KeyValue extends BaseEntityValue,
	Snapshot extends any,
> =
	| ListEntity<Init, KeyValue, Snapshot>
	| ObjectEntity<Init, KeyValue, Snapshot>;

export type ListItemValue<KeyValue> =
	KeyValue extends Array<infer T> ? T : never;
export type ListItemInit<Init> = Init extends Array<infer T> ? T : never;

export type EntityDestructured<T extends AnyEntity<any, any, any> | null> =
	| (T extends ListEntity<any, infer KeyValue, any>
			? KeyValue
			: T extends ObjectEntity<any, infer KeyValue, any>
				? KeyValue
				: never)
	| (T extends null ? null : never);

export type EntityInit<T extends AnyEntity<any, any, any>> =
	T extends ListEntity<infer Init, any, any>
		? Init
		: T extends ObjectEntity<infer Init, any, any>
			? Init
			: never;
