import {
	CollectionCompoundIndexFilter,
	CollectionFilter,
	MatchCollectionIndexFilter,
	RangeCollectionIndexFilter,
	SortIndexFilter,
	StartsWithIndexFilter,
} from './types.js';

export function isMatchIndexFilter(
	filter: CollectionFilter,
): filter is MatchCollectionIndexFilter {
	return (filter as any).equals !== undefined;
}

export function isRangeIndexFilter(
	filter: CollectionFilter,
): filter is RangeCollectionIndexFilter {
	return (
		(filter as any).gte !== undefined ||
		(filter as any).lte !== undefined ||
		(filter as any).gt !== undefined ||
		(filter as any).lt !== undefined
	);
}

export function isCompoundIndexFilter(
	filter: CollectionFilter,
): filter is CollectionCompoundIndexFilter {
	return !!(filter as any).match;
}

export function isStartsWithIndexFilter(
	filter: CollectionFilter,
): filter is StartsWithIndexFilter {
	return (filter as any).startsWith !== undefined;
}

export function isSortIndexFilter(
	filter: CollectionFilter,
): filter is SortIndexFilter {
	return (
		!isRangeIndexFilter(filter) &&
		!isMatchIndexFilter(filter) &&
		!isCompoundIndexFilter(filter) &&
		!isStartsWithIndexFilter(filter) &&
		(filter as any).order
	);
}
