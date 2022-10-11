import {
	CollectionFilter,
	CollectionIndexName,
	RangeCollectionIndexFilter,
	StorageSchema,
	StorageCollectionSchema,
	MatchCollectionIndexFilter,
	CollectionCompoundIndexFilter,
	createLowerBoundIndexValue,
	createUpperBoundIndexValue,
	isRangeIndexFilter,
	isMatchIndexFilter,
	StorageDocumentInit,
	SchemaCollection,
	SchemaCollectionName,
} from '@lofi-db/common';
import { assert } from '@aglio/tools';
import { ObjectEntity } from './Entity.js';
import { Query } from './Query.js';
import { QueryStore } from './QueryStore.js';

export class QueryMaker<Schema extends StorageSchema<any>> {
	constructor(
		private readonly queryStore: QueryStore,
		private readonly schema: StorageSchema<any>,
	) {}

	get = <Collection extends SchemaCollectionName<Schema>>(
		collection: Collection,
		primaryKey: string,
	): Query<
		ObjectEntity<StorageDocumentInit<SchemaCollection<Schema, Collection>>>
	> => {
		return this.queryStore.get({
			collection: collection as string,
			range: primaryKey,
			single: true,
		});
	};

	findOne = <
		Collection extends SchemaCollectionName<Schema>,
		Index extends CollectionIndexName<Schema['collections'][Collection]>,
	>(
		collection: Collection,
		query?: CollectionFilter<Schema['collections'][Collection], Index>,
	): Query<
		ObjectEntity<StorageDocumentInit<SchemaCollection<Schema, Collection>>>
	> => {
		return this.queryStore.get({
			collection: collection as string,
			range: this.getRange(collection as string, query),
			single: true,
			index: query?.where,
			direction: query?.order === 'desc' ? 'prev' : 'next',
		});
	};

	findAll = <
		Collection extends SchemaCollectionName<Schema>,
		Index extends CollectionIndexName<Schema['collections'][Collection]>,
	>(
		collection: Collection,
		query?: CollectionFilter<Schema['collections'][Collection], Index>,
	): Query<
		ObjectEntity<StorageDocumentInit<SchemaCollection<Schema, Collection>>>[]
	> => {
		return this.queryStore.get({
			collection: collection as string,
			range: this.getRange(collection as string, query),
			index: query?.where,
			direction: query?.order === 'desc' ? 'prev' : 'next',
		});
	};

	private rangeIndexToIdbKeyRange = (
		filter: RangeCollectionIndexFilter<
			StorageCollectionSchema<any, any, any>,
			CollectionIndexName<StorageCollectionSchema<any, any, any>>
		>,
	) => {
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

	private matchIndexToIdbKeyRange = (
		filter: MatchCollectionIndexFilter<
			StorageCollectionSchema<any, any, any>,
			CollectionIndexName<StorageCollectionSchema<any, any, any>>
		>,
	) => {
		return IDBKeyRange.only(filter.equals as string | number);
	};

	private compoundIndexToIdbKeyRange = (
		collection: string,
		filter: CollectionCompoundIndexFilter<
			StorageCollectionSchema<any, any, any>,
			CollectionIndexName<StorageCollectionSchema<any, any, any>>
		>,
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

		// create our bounds for the matched values
		const lower = createLowerBoundIndexValue(...matchedValues);
		const upper = createUpperBoundIndexValue(...matchedValues);
		if (lower === upper) {
			return IDBKeyRange.only(lower);
		}
		return IDBKeyRange.bound(lower, upper);
	};

	private getRange = (
		collection: string,
		index?: CollectionFilter<any, any>,
	) => {
		if (!index) return undefined;
		if (isRangeIndexFilter(index)) return this.rangeIndexToIdbKeyRange(index);
		if (isMatchIndexFilter(index)) return this.matchIndexToIdbKeyRange(index);
		return this.compoundIndexToIdbKeyRange(collection, index);
	};
}
