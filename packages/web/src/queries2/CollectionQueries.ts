import { CollectionFilter, hashObject } from '@lo-fi/common';
import { Context } from '../context.js';
import { EntityStore } from '../reactives/EntityStore.js';
import { GetQuery } from './GetQuery.js';
import { QueryCache } from './QueryCache.js';
import { FindOneQuery } from './FindOneQuery.js';
import { FindPageQuery } from './FindPageQuery.js';
import { FindInfiniteQuery } from './FindInfiniteQuery.js';
import { FindAllQuery } from './FindAllQuery.js';
import { DocumentManager } from '../DocumentManager.js';
import cuid from 'cuid';

export class CollectionQueries {
	private cache;
	private collection;
	private hydrate;
	private context;
	private documentManager;

	put;
	delete;
	deleteAll;

	constructor({
		collection,
		cache,
		entities,
		context,
		documentManager,
	}: {
		collection: string;
		cache: QueryCache;
		entities: EntityStore;
		context: Context;
		documentManager: DocumentManager<any>;
	}) {
		this.cache = cache;
		this.collection = collection;
		this.hydrate = entities.get;
		this.context = context;
		this.documentManager = documentManager;

		this.put = this.documentManager.create.bind(
			this.documentManager,
			this.collection,
		);
		this.delete = this.documentManager.delete.bind(
			this.documentManager,
			this.collection,
		);
		this.deleteAll = this.documentManager.deleteAllFromCollection.bind(
			this.documentManager,
			this.collection,
		);
	}

	private serializeIndex = (index?: CollectionFilter) => {
		if (!index) return '';
		return hashObject(index);
	};

	get = (id: string) => {
		const key = `get:${this.collection}:${id}`;
		return this.cache.getOrSet(
			key,
			() =>
				new GetQuery({
					id,
					collection: this.collection,
					hydrate: this.hydrate,
					context: this.context,
					key,
				}),
		);
	};

	findOne = ({ index }: { index?: CollectionFilter } = {}) => {
		const key = `findOne:${this.collection}:${this.serializeIndex(index)}`;
		return this.cache.getOrSet(
			key,
			() =>
				new FindOneQuery({
					index,
					collection: this.collection,
					hydrate: this.hydrate,
					context: this.context,
					key,
				}),
		);
	};

	findAll = ({ index }: { index?: CollectionFilter } = {}) => {
		const key = `findAll:${this.collection}:${this.serializeIndex(index)}`;
		return this.cache.getOrSet(
			key,
			() =>
				new FindAllQuery({
					index,
					collection: this.collection,
					hydrate: this.hydrate,
					context: this.context,
					key,
				}),
		);
	};

	findPage = ({
		index,
		pageSize,
		page,
	}: {
		index?: CollectionFilter;
		pageSize: number;
		page: number;
	}) => {
		const key = cuid();

		return this.cache.set(
			new FindPageQuery({
				index,
				collection: this.collection,
				hydrate: this.hydrate,
				context: this.context,
				key,
				pageSize,
				page,
			}),
		);
	};

	findAllInfinite = ({
		index,
		pageSize,
	}: {
		index?: CollectionFilter;
		pageSize: number;
	}) => {
		const key = cuid();
		return this.cache.getOrSet(
			key,
			() =>
				new FindInfiniteQuery({
					index,
					collection: this.collection,
					hydrate: this.hydrate,
					context: this.context,
					key,
					pageSize,
				}),
		);
	};
}
