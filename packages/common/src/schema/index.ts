import { isIndexed } from './fields.js';
import {
	CollectionCompoundIndices,
	StorageCollectionSchema,
	StorageDirectSyntheticSchema,
	StorageFieldsSchema,
	StorageSchema,
	StorageSyntheticIndexSchema,
	StorageSyntheticIndices,
} from './types.js';
import { fields } from './fieldHelpers.js';
import cuid from 'cuid';

export function collection<
	Fields extends StorageFieldsSchema,
	Synthetics extends StorageSyntheticIndices<Fields>,
	Compounds extends CollectionCompoundIndices<Fields, Synthetics>,
>({
	synthetics,
	indexes,
	...input
}: StorageCollectionSchema<
	Fields,
	Synthetics,
	Compounds
>): StorageCollectionSchema<Fields, Synthetics, Compounds> {
	// back compat - copy synthetics in with indexes
	const finalIndexes = { ...synthetics, ...indexes };
	// add all indexed fields into the synthetic indices (back compat)
	for (const [key, field] of Object.entries(input.fields)) {
		if (isIndexed(field)) {
			finalIndexes[key] = {
				field: key,
			} as StorageDirectSyntheticSchema<Fields>;
		}
	}
	return {
		...input,
		indexes: finalIndexes as Synthetics,
	};
}

export function schema<
	// Fields extends StorageFieldsSchema,
	// Indexes extends StorageSyntheticIndices<Fields>,
	// Compounds extends CollectionCompoundIndices<Fields, Indexes>,
	Schema extends StorageSchema<{
		[key: string]: StorageCollectionSchema<any, any, any>;
	}>,
>(input: Schema): StorageSchema {
	return input;
}
schema.collection = collection;
schema.fields = fields;
schema.generated = {
	id: cuid,
};

export * from './types.js';

export * from './indexFilters.js';
export * from './fields.js';
export * from './validation.js';
export * from './children.js';
