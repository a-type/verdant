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
	MatchCollectionIndexFilter,
	RangeCollectionIndexFilter,
	SortIndexFilter,
	StorageSchema,
} from '@lo-fi/common';
import { ObjectEntity } from './reactives/Entity.js';
import { Query } from './Query.js';
import { QueryStore } from './QueryStore.js';

export class QueryMaker {
	constructor(
		private readonly queryStore: QueryStore,
		private readonly schema: StorageSchema<any>,
	) {}

	get = (collection: string, primaryKey: string): Query<ObjectEntity<any>> => {
		return this.queryStore.get({
			collection: collection as string,
			range: primaryKey,
			single: true,
		});
	};

	findOne = (
		collection: string,
		query?: CollectionFilter,
	): Query<ObjectEntity<any>> => {
		return this.queryStore.get({
			collection,
			range: this.getRange(collection, query),
			single: true,
			index: query?.where,
			direction: query?.order === 'desc' ? 'prev' : 'next',
		});
	};

	findAll = (
		collection: string,
		query?: CollectionFilter,
	): Query<ObjectEntity<any>[]> => {
		return this.queryStore.get({
			collection,
			range: this.getRange(collection, query),
			index: query?.where,
			direction: query?.order === 'desc' ? 'prev' : 'next',
		});
	};

	private rangeIndexToIdbKeyRange = (filter: RangeCollectionIndexFilter) => {
		const lower = filter.gte || filter.gt;
		const upper = filter.lte || filter.lt;
		if (lower === upper) {
			return IDBKeyRange.only(lower);
		}
		if (!lower) {
			return IDBKeyRange.upperBound(upper, !!filter.lt);
		} else if (!upper) {
			return IDBKeyRange.lowerBound(lower, !!filter.gt);
		} else {
			return IDBKeyRange.bound(lower, upper, !!filter.gt, !!filter.lt);
		}
	};

	private matchIndexToIdbKeyRange = (filter: MatchCollectionIndexFilter) => {
		return IDBKeyRange.only(filter.equals as string | number);
	};

	private sortIndexToIdbKeyRange = (filter: SortIndexFilter) => {
		return undefined;
	};

	private compoundIndexToIdbKeyRange = (
		collection: string,
		filter: CollectionCompoundIndexFilter,
	) => {
		// validate the usage of the compound index:
		// - all match fields must be contiguous at the start of the compound order
		const indexDefinition =
			this.schema.collections[collection].compounds[filter.where];
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
			(key) =>
				filter.match[key as keyof typeof filter.match] as string | number,
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

	private getRange = (collection: string, index?: CollectionFilter) => {
		if (!index) return undefined;
		if (isRangeIndexFilter(index)) return this.rangeIndexToIdbKeyRange(index);
		if (isMatchIndexFilter(index)) return this.matchIndexToIdbKeyRange(index);
		if (isSortIndexFilter(index)) return this.sortIndexToIdbKeyRange(index);
		return this.compoundIndexToIdbKeyRange(collection, index);
	};
}
