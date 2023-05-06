import {
	CollectionCompoundIndex,
	CompoundIndexValue,
	createCompoundIndexValue,
	StorageCollectionSchema,
	StorageSyntheticIndexSchema,
} from '@verdant/common';

export function computeSynthetics(schema: StorageCollectionSchema, obj: any) {
	const result: Record<string, any> = {};
	for (const [name, property] of Object.entries(schema.synthetics || {})) {
		result[name] = (property as StorageSyntheticIndexSchema<any>).compute(obj);
	}
	return result;
}

export function computeCompoundIndices(
	schema: StorageCollectionSchema<any, any, any>,
	doc: any,
): any {
	return Object.entries(schema.compounds || {}).reduce<
		Record<string, CompoundIndexValue>
	>((acc, [indexKey, index]) => {
		acc[indexKey] = createCompoundIndexValue(
			...(index as CollectionCompoundIndex<any, any>).of.map(
				(key) => doc[key] as string | number,
			),
		);
		return acc;
	}, {} as Record<string, CompoundIndexValue>);
}
