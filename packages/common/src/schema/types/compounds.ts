import {
	StorageArrayFieldSchema,
	StorageBooleanFieldSchema,
	StorageFieldsSchema,
	StorageNumberFieldSchema,
	StorageStringFieldSchema,
} from './fields.js';
import {
	DirectIndexableFieldName,
	StorageSyntheticIndices,
} from './synthetics.js';

// arrays of primitives are eligible for compound indices
type PrimitiveArrayFields<Fields extends StorageFieldsSchema> = {
	[K in keyof Fields as Fields[K] extends StorageArrayFieldSchema<infer U>
		? U extends
				| StorageStringFieldSchema
				| StorageNumberFieldSchema
				| StorageBooleanFieldSchema
			? K
			: never
		: never]: Fields[K];
};
type PrimitiveArrayFieldName<Fields extends StorageFieldsSchema> = Extract<
	keyof PrimitiveArrayFields<Fields>,
	string
>;

export type CollectionCompoundIndex<
	Fields extends StorageFieldsSchema,
	Synthetics extends StorageSyntheticIndices<Fields>,
> = {
	// object fields cannot be compound index inputs
	of: (
		| DirectIndexableFieldName<Fields>
		| PrimitiveArrayFieldName<Fields>
		| Extract<keyof Synthetics, string>
	)[];
};

export type CollectionCompoundIndices<
	Fields extends StorageFieldsSchema,
	Synthetics extends StorageSyntheticIndices<Fields>,
> = Record<string, CollectionCompoundIndex<Fields, Synthetics>>;
