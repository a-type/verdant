import {
	CollectionIndexName,
	MatchCollectionIndexFilter,
	CollectionFilter,
	StorageCollectionSchema,
	RangeCollectionIndexFilter,
	CollectionCompoundIndexFilter,
} from './types.js';

export function isMatchIndexFilter<
	C extends StorageCollectionSchema<any, any, any>,
	I extends CollectionIndexName<C>,
>(filter: CollectionFilter<C, I>): filter is MatchCollectionIndexFilter<C, I> {
	return !!(filter as any).equals;
}

export function isRangeIndexFilter<
	C extends StorageCollectionSchema<any, any, any>,
	I extends CollectionIndexName<C>,
>(filter: CollectionFilter<C, I>): filter is RangeCollectionIndexFilter<C, I> {
	return (
		!!(filter as any).gte ||
		!!(filter as any).lte ||
		!!(filter as any).gt ||
		!!(filter as any).lt
	);
}

export function isCompoundIndexFilter<
	C extends StorageCollectionSchema<any, any, any>,
	I extends CollectionIndexName<C>,
>(
	filter: CollectionFilter<C, I>,
): filter is CollectionCompoundIndexFilter<C, I> {
	return !!(filter as any).match;
}
