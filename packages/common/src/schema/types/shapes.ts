import {
	StorageCollectionSchema,
	StoragePropertySchema,
} from './collection.js';
import {
	NestedStorageFieldsSchema,
	StorageArrayFieldSchema,
	StorageFieldsSchema,
	StorageMapFieldSchema,
	StorageObjectFieldSchema,
} from './fields.js';

type StoragePropertyIsNullable<T extends StoragePropertySchema<any>> =
	T extends { nullable?: boolean }
		? T['nullable'] extends boolean
			? true
			: false
		: T['type'] extends 'any'
		? true
		: false;

export type BaseShapeFromProperty<T extends StoragePropertySchema<any>> =
	T['type'] extends 'string'
		? string
		: T['type'] extends 'number'
		? number
		: T['type'] extends 'boolean'
		? boolean
		: T extends StorageArrayFieldSchema
		? ShapeFromProperty<T['items']>[]
		: T extends StorageObjectFieldSchema
		? ShapeFromFields<T['properties']>
		: T extends StorageMapFieldSchema<any>
		? Record<string, ShapeFromProperty<T['values']>>
		: T['type'] extends 'any'
		? any
		: T['type'] extends 'file'
		? File
		: never;

export type ShapeFromProperty<T extends StoragePropertySchema<any>> =
	StoragePropertyIsNullable<T> extends true
		? BaseShapeFromProperty<T> | null
		: BaseShapeFromProperty<T>;

export type ShapeFromFields<
	T extends StorageFieldsSchema | NestedStorageFieldsSchema,
> = {
	[K in keyof T]: ShapeFromProperty<T[K]>;
};

export type StorageDocument<
	Collection extends StorageCollectionSchema<any, any, any>,
> = ShapeFromFields<Collection['fields']>;

type StoragePropertyIsOptional<T extends StoragePropertySchema<any>> =
	StoragePropertyIsNullable<T> extends true
		? true
		: T extends { default?: any }
		? true
		: T['type'] extends 'any'
		? true
		: T['type'] extends 'array'
		? true
		: T['type'] extends 'map'
		? true
		: false;

type ShapeFromFieldsWithDefaults<
	T extends StorageFieldsSchema | NestedStorageFieldsSchema,
> = {
	[K in keyof T as StoragePropertyIsOptional<T[K]> extends true
		? K
		: never]?: ShapeFromProperty<T[K]>;
} & {
	[K in keyof T as StoragePropertyIsOptional<T[K]> extends true
		? never
		: K]: ShapeFromProperty<T[K]>;
};

export type StorageDocumentInit<
	Collection extends StorageCollectionSchema<any, any, any>,
> = ShapeFromFieldsWithDefaults<Collection['fields']>;
