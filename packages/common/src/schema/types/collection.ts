import { CollectionCompoundIndices } from './compounds.js';
import {
	NestedStorageFieldSchema,
	StorageFieldSchema,
	StorageFieldsSchema,
	StorageIndexableFields,
} from './fields.js';
import { StorageDocument } from './shapes.js';
import {
	StorageSyntheticIndexSchema,
	StorageSyntheticIndices,
} from './synthetics.js';

/**
 * The main collection schema
 */
export type StorageCollectionSchema<
	Fields extends StorageFieldsSchema,
	Synthetics extends StorageSyntheticIndices<Fields>,
	Compounds extends CollectionCompoundIndices<Fields, Synthetics>,
> = {
	name: string;
	fields: Fields;
	synthetics: Synthetics;
	compounds: Compounds;
	primaryKey: StorageIndexablePropertyName<Fields, Synthetics>;
};

export type NamedSchema<
	Schemas extends StorageCollectionSchema<any, any, any>,
	Name extends string,
> = Schemas extends { name: Name } ? Schemas : never;

export type IndexedSchemaProperties<
	Schema extends StorageCollectionSchema<any, any, any>,
> = {
	[K in keyof CollectionSchemaFields<Schema> as CollectionSchemaFields<Schema>[K] extends {
		indexed: true;
	}
		? K
		: never]: CollectionSchemaFields<Schema>[K];
} & CollectionSchemaComputedIndexes<Schema> &
	CollectionSchemaCompoundIndexes<Schema>;

export type CollectionIndexName<
	Collection extends StorageCollectionSchema<any, any, any>,
> = Extract<keyof IndexedSchemaProperties<Collection>, string>;

export type CollectionProperties<
	Collection extends StorageCollectionSchema<any, any, any>,
> = Collection['fields'] & Collection['synthetics'];

export type CollectionPropertyName<
	Collection extends StorageCollectionSchema<any, any, any>,
> = Exclude<keyof CollectionProperties<Collection>, number | symbol>;

export type CollectionEvents<
	Collection extends StorageCollectionSchema<any, any, any>,
> = {
	put: (value: StorageDocument<Collection>) => void;
	delete: (id: string) => void;
	[key: `put:${string}`]: (value: StorageDocument<Collection>) => void;
	[key: `delete:${string}`]: () => void;
};

export type SchemaForCollection<
	Collection extends StorageCollectionSchema<any, any, any>,
> = Collection;

export type CollectionSchemaFields<
	Schema extends StorageCollectionSchema<any, any, any>,
> = Schema extends StorageCollectionSchema<infer F, any, any> ? F : never;
export type CollectionSchemaComputedIndexes<
	Schema extends StorageCollectionSchema<any, any, any>,
> = Schema extends StorageCollectionSchema<any, infer S, any> ? S : never;
export type CollectionSchemaCompoundIndexes<
	Schema extends StorageCollectionSchema<any, any, any>,
> = Schema extends StorageCollectionSchema<any, any, infer C> ? C : never;

export type StorageIndexableProperties<
	Schema extends StorageCollectionSchema<any, any, any>,
> = {
	[K in keyof CollectionSchemaFields<Schema>]: CollectionSchemaFields<Schema>[K] extends {
		indexed: boolean;
	}
		? CollectionSchemaFields<Schema>[K]
		: never;
} & CollectionSchemaComputedIndexes<Schema>;

export type StorageSchemaProperty<
	Schema extends StorageCollectionSchema<any, any, any>,
> = StorageSchemaProperties<Schema>[keyof StorageSchemaProperties<Schema>];

export type StorageSchemaPropertyName<
	Schema extends StorageCollectionSchema<any, any, any>,
> = Extract<keyof StorageSchemaProperties<Schema>, string>;

export type GetSchemaProperty<
	Schema extends StorageCollectionSchema<any, any, any>,
	Key extends StorageSchemaPropertyName<Schema>,
> = StorageSchemaProperties<Schema>[Key];

export type StoragePropertySchema<BaseFields extends StorageFieldsSchema> =
	| StorageFieldSchema
	| NestedStorageFieldSchema
	| StorageSyntheticIndexSchema<BaseFields>;

export type StoragePropertyName<
	Fields extends StorageFieldsSchema,
	Synthetics extends StorageSyntheticIndices<Fields>,
> =
	| Exclude<keyof Fields, number | symbol>
	| Exclude<keyof Synthetics, number | symbol>;

export type StorageIndexablePropertyName<
	Fields extends StorageFieldsSchema,
	Synthetics extends StorageSyntheticIndices<Fields>,
> =
	| Extract<keyof StorageIndexableFields<Fields>, string>
	| Extract<keyof Synthetics, string>;

export type StorageSchemaProperties<
	Schema extends StorageCollectionSchema<any, any, any>,
> = Schema extends StorageCollectionSchema<infer F, infer S, infer C>
	? F & S & C
	: never;
