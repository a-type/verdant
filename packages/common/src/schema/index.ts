import { isIndexed } from './fields.js';
import {
	CollectionCompoundIndices,
	StorageCollectionSchema,
	StorageDirectSyntheticSchema,
	StorageFieldsSchema,
	StorageSchema,
	StorageSyntheticIndices,
} from './types.js';

export function collection<
	Fields extends StorageFieldsSchema,
	Synthetics extends StorageSyntheticIndices<Fields>,
	Compounds extends CollectionCompoundIndices<Fields, Synthetics>,
>(input: StorageCollectionSchema<Fields, Synthetics, Compounds>) {
	const indexes = { ...input.synthetics, ...input.indexes };
	// add all indexed fields into the synthetic indices (back compat)
	for (const [key, field] of Object.entries(input.fields)) {
		if (isIndexed(field)) {
			indexes[key] = {
				field: key,
			} as StorageDirectSyntheticSchema<Fields>;
		}
	}
	return {
		...input,
		indexes,
	};
}

export function schema<
	Schema extends StorageSchema<{
		[key: string]: StorageCollectionSchema<any, any, any>;
	}>,
>(input: Schema): StorageSchema {
	return input;
}

export * from './types.js';

export * from './indexFilters.js';
export * from './fields.js';
