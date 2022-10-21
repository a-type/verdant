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
