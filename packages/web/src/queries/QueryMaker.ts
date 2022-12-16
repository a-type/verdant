import { CollectionFilter, StorageSchema } from '@lo-fi/common';
import { Context } from '../context.js';
import { Query } from './Query.js';
import { BaseQueryStore } from './QueryStore.js';
import { getRange } from './ranges.js';

export class QueryMaker<Result, Store extends BaseQueryStore<Query>> {
	constructor(private readonly queryStore: Store, private context: Context) {}

	get = (collection: string, primaryKey: string): Query<Result> => {
		return this.queryStore.get({
			collection: collection as string,
			range: primaryKey,
			single: true,
		});
	};

	findOne = (collection: string, query?: CollectionFilter): Query<Result> => {
		return this.queryStore.get({
			collection,
			range: this.getRange(collection, query),
			single: true,
			index: query?.where,
			direction: query?.order === 'desc' ? 'prev' : 'next',
		});
	};

	findAll = (collection: string, query?: CollectionFilter): Query<Result[]> => {
		return this.queryStore.get({
			collection,
			range: this.getRange(collection, query),
			index: query?.where,
			direction: query?.order === 'desc' ? 'prev' : 'next',
		});
	};

	private getRange = (collection: string, index?: CollectionFilter) => {
		return getRange(this.context.schema, collection, index);
	};

	setContext = (context: Context) => {
		this.context = context;
	};
}
