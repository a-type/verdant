import {
	CollectionCompoundIndices,
	StorageCollectionSchema,
	StorageFieldsSchema,
	StorageSchema,
	StorageSyntheticIndices,
} from './types.js';

export function collection<
	Fields extends StorageFieldsSchema,
	Synthetics extends StorageSyntheticIndices<Fields>,
	Compounds extends CollectionCompoundIndices<Fields, Synthetics>,
>(input: StorageCollectionSchema<Fields, Synthetics, Compounds>) {
	return input;
}

export function schema<
	Schema extends StorageSchema<{
		[key: string]: StorageCollectionSchema<any, any, any>;
	}>,
>(input: Schema) {
	return input;
}

export * from './types.js';

export * from './indexFilters.js';
