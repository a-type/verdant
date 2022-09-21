import {
	CollectionSchemaCompoundIndexes,
	StorageCollectionSchema,
	StoragePropertyName,
} from './collection.js';
import { StorageFieldsSchema, StorageObjectFieldSchema } from './fields.js';
import { StorageSyntheticIndices } from './synthetics.js';

type OmitObjectFields<T extends StorageFieldsSchema> = {
	[K in keyof T]: T[K] extends StorageObjectFieldSchema ? never : T[K];
};

export type CollectionCompoundIndex<
	Fields extends StorageFieldsSchema,
	Synthetics extends StorageSyntheticIndices<Fields>,
> = {
	// object fields cannot be compound index inputs
	of: StoragePropertyName<OmitObjectFields<Fields>, Synthetics>[];
	unique?: boolean;
};
type CompoundFieldNameTuple<Name extends string> =
	| [Name, Name]
	| [Name, Name, Name]
	| [Name, Name, Name, Name]
	| [Name, Name, Name, Name, Name];

export type CollectionCompoundIndices<
	Fields extends StorageFieldsSchema,
	Synthetics extends StorageSyntheticIndices<Fields>,
> = Record<string, CollectionCompoundIndex<Fields, Synthetics>>;

export type CollectionCompoundIndexName<
	Collection extends StorageCollectionSchema<any, any, any>,
> = Exclude<keyof CollectionSchemaCompoundIndexes<Collection>, number | symbol>;
