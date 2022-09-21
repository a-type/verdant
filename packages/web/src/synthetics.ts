import {
	StorageCollectionSchema,
	StorageSyntheticIndexSchema,
} from '@lofi/common';

export function computeSynthetics(
	schema: StorageCollectionSchema<any, any, any>,
	obj: any,
) {
	const result: Record<string, any> = {};
	for (const [name, property] of Object.entries(schema.synthetics)) {
		result[name] = (property as StorageSyntheticIndexSchema<any>).compute(obj);
	}
	return result;
}
