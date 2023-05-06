import {
	assert,
	CollectionCompoundIndexFilter,
	CollectionFilter,
	createCompoundIndexValue,
	createLowerBoundIndexValue,
	createUpperBoundIndexValue,
	isMatchIndexFilter,
	isRangeIndexFilter,
	isSortIndexFilter,
	isStartsWithIndexFilter,
	MatchCollectionIndexFilter,
	RangeCollectionIndexFilter,
	sanitizeIndexValue,
	SortIndexFilter,
	StartsWithIndexFilter,
	StorageSchema,
} from '@verdant/common';

const matchIndexToIdbKeyRange = (filter: MatchCollectionIndexFilter) => {
	return IDBKeyRange.only(sanitizeIndexValue(filter.equals));
};

const sortIndexToIdbKeyRange = (filter: SortIndexFilter) => {
	return undefined;
};

const rangeIndexToIdbKeyRange = (filter: RangeCollectionIndexFilter) => {
	const lower = filter.gte || filter.gt;
	const upper = filter.lte || filter.lt;
	if (lower === upper) {
		return IDBKeyRange.only(sanitizeIndexValue(lower));
	}
	if (!lower) {
		return IDBKeyRange.upperBound(sanitizeIndexValue(upper), !!filter.lt);
	} else if (!upper) {
		return IDBKeyRange.lowerBound(sanitizeIndexValue(lower), !!filter.gt);
	} else {
		return IDBKeyRange.bound(
			sanitizeIndexValue(lower),
			sanitizeIndexValue(upper),
			!!filter.gt,
			!!filter.lt,
		);
	}
};

const compoundIndexToIdbKeyRange = (
	// FIXME:
	schema: any,
	collection: string,
	filter: CollectionCompoundIndexFilter,
) => {
	// validate the usage of the compound index:
	// - all match fields must be contiguous at the start of the compound order
	const indexDefinition =
		schema.collections[collection].compounds[filter.where];
	assert(
		indexDefinition,
		`Index ${filter.where} does not exist on collection ${collection}`,
	);
	const matchedKeys = Object.keys(filter.match).sort(
		(a, b) => indexDefinition.of.indexOf(a) - indexDefinition.of.indexOf(b),
	);
	for (const key of matchedKeys) {
		if (indexDefinition.of.indexOf(key) !== matchedKeys.indexOf(key)) {
			throw new Error(
				`Compound index ${filter.where} does not have ${key} at the start of its order`,
			);
		}
	}

	const matchedValues = matchedKeys.map(
		(key) => filter.match[key as keyof typeof filter.match] as string | number,
	);

	// special case: all match fields are specified - we don't need a range
	// query, just a single key query
	if (matchedKeys.length === indexDefinition.of.length) {
		return IDBKeyRange.only(createCompoundIndexValue(...matchedValues));
	}

	// create our bounds for the matched values
	const lower = createLowerBoundIndexValue(...matchedValues);
	const upper = createUpperBoundIndexValue(...matchedValues);
	return IDBKeyRange.bound(lower, upper);
};

function startsWithIndexToIdbKeyRange(filter: StartsWithIndexFilter) {
	const lower = filter.startsWith;
	const upper = filter.startsWith + '\uffff';
	return IDBKeyRange.bound(lower, upper);
}

export function getRange(
	schema: StorageSchema,
	collection: string,
	index?: CollectionFilter,
) {
	if (!index) return undefined;
	if (isRangeIndexFilter(index)) return rangeIndexToIdbKeyRange(index);
	if (isMatchIndexFilter(index)) return matchIndexToIdbKeyRange(index);
	if (isSortIndexFilter(index)) return sortIndexToIdbKeyRange(index);
	if (isStartsWithIndexFilter(index))
		return startsWithIndexToIdbKeyRange(index);
	return compoundIndexToIdbKeyRange(schema, collection, index);
}
