import { CollectionFilter, StorageSchema } from '@lo-fi/common';
import { Context } from '../context.js';
import { Query } from './Query.js';
import { getRange } from './ranges.js';
import { QueryStore } from './QueryStore.js';

export class QueryMaker {
	constructor(
		private readonly queryStore: QueryStore,
		private context: Context,
	) {}

	get = (collection: string, primaryKey: string) => {
		return this.queryStore.get({
			collection: collection as string,
			range: primaryKey,
			single: true,
		}) as any;
	};

	findOne = (collection: string, query?: CollectionFilter) => {
		return this.queryStore.get({
			collection,
			range: this.getRange(collection, query),
			single: true,
			index: query?.where,
			direction: query?.order === 'desc' ? 'prev' : 'next',
		});
	};

	findAll = (collection: string, query?: CollectionFilter, limit?: number) => {
		return this.queryStore.get({
			collection,
			range: this.getRange(collection, query),
			index: query?.where,
			direction: query?.order === 'desc' ? 'prev' : 'next',
			limit,
		});
	};

	private getRange = (collection: string, index?: CollectionFilter) => {
		return getRange(this.context.schema, collection, index);
	};

	setContext = (context: Context) => {
		this.context = context;
	};
}
