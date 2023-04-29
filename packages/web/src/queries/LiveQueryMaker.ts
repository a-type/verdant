import { CollectionFilter } from '@lo-fi/common';
import { Context } from '../context.js';
import { ObjectEntity } from '../index.js';
import { LiveQuery } from './LiveQuery.js';
import { LiveQueryStore } from './LiveQueryStore.js';
import { getRange } from './ranges.js';

export class LiveQueryMaker<
	Result extends ObjectEntity<any, any, any> = ObjectEntity<any, any, any>,
> {
	constructor(
		private readonly queryStore: LiveQueryStore,
		private context: Context,
	) {}

	get = (collection: string, primaryKey: string): LiveQuery<Result> => {
		return this.queryStore.get({
			collection: collection as string,
			range: primaryKey,
			single: true,
		});
	};

	findOne = (
		collection: string,
		query?: CollectionFilter,
	): LiveQuery<Result> => {
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
		limit?: number,
	): LiveQuery<Result[]> => {
		return this.queryStore.get({
			collection,
			range: this.getRange(collection, query),
			index: query?.where,
			direction: query?.order === 'desc' ? 'prev' : 'next',
			limit,
		});
	};

	findAllPaginated = (
		collection: string,
		query?: CollectionFilter,
		limit?: number,
	): LiveQuery<Result[]> => {
		return this.queryStore.get({
			collection,
			range: this.getRange(collection, query),
			index: query?.where,
			direction: query?.order === 'desc' ? 'prev' : 'next',
			limit,
			updater: (_, next) => next,
		});
	};

	findAllInfinite = (
		collection: string,
		query?: CollectionFilter,
		limit?: number,
	): LiveQuery<Result[]> => {
		return this.queryStore.get({
			collection,
			range: this.getRange(collection, query),
			index: query?.where,
			direction: query?.order === 'desc' ? 'prev' : 'next',
			limit,
			// updater: (prev, next) => prev.concat(next),
			updater: (prev, next) => [...prev, ...next],
		});
	};

	private getRange = (collection: string, index?: CollectionFilter) => {
		return getRange(this.context.schema, collection, index);
	};

	setContext = (context: Context) => {
		this.context = context;
	};
}
