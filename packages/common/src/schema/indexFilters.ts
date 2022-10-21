import {
	CollectionCompoundIndexFilter,
	CollectionFilter,
	MatchCollectionIndexFilter,
	RangeCollectionIndexFilter,
} from './types.js';

export function isMatchIndexFilter(
	filter: CollectionFilter,
): filter is MatchCollectionIndexFilter {
	return !!(filter as any).equals;
}

export function isRangeIndexFilter(
	filter: CollectionFilter,
): filter is RangeCollectionIndexFilter {
	return (
		!!(filter as any).gte ||
		!!(filter as any).lte ||
		!!(filter as any).gt ||
		!!(filter as any).lt
	);
}

export function isCompoundIndexFilter(
	filter: CollectionFilter,
): filter is CollectionCompoundIndexFilter {
	return !!(filter as any).match;
}
