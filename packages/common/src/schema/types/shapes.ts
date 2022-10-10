import {
	CollectionSchemaComputedIndexes,
	StorageCollectionSchema,
	StoragePropertySchema,
} from './collection.js';
import {
	NestedStorageFieldsSchema,
	StorageArrayFieldSchema,
	StorageFieldsSchema,
	StorageObjectFieldSchema,
} from './fields.js';
import { StorageSyntheticIndices } from './synthetics.js';

type StoragePropertyIsNullable<T extends StoragePropertySchema<any>> =
	T extends { nullable?: boolean }
		? T['nullable'] extends boolean
			? true
			: false
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

export type ShapeFromComputeds<T extends StorageSyntheticIndices<any>> = {
	[K in keyof T]: ShapeFromProperty<T[K]>;
};

export type StorageDocument<
	Collection extends StorageCollectionSchema<any, any, any>,
> = ShapeFromFields<Collection['fields']>;

export type StorageDocumentInit<
	Collection extends StorageCollectionSchema<any, any, any>,
> = ShapeFromFields<Collection['fields']>;

export type StorageDocumentWithComputedIndices<
	Collection extends StorageCollectionSchema<any, any, any>,
> = StorageDocument<Collection> &
	ShapeFromComputeds<CollectionSchemaComputedIndexes<Collection>>;

/**
 * The shape of an actual indexable value in a property used in a compound
 * index. We do not allow complex values in compound indexes besides arrays,
 * and arrays must be of primitives only. This type filters out anything
 * more complicated to `never` and flattens the array type to the item type.
 */
export type IndexableShapeFromCompoundProperty<
	T extends StoragePropertySchema<any>,
> = T['type'] extends 'string'
	? string
	: T['type'] extends 'number'
	? number
	: T['type'] extends 'boolean'
	? boolean
	: T extends StorageArrayFieldSchema
	? // filter out complex arrays
	  ShapeFromProperty<T['items']> extends string | number
		? ShapeFromProperty<T['items']>
		: never
	: never;
