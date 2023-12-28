import { CollectionFilter, hashObject } from '@verdant-web/common';
import { Context } from '../context.js';
import { EntityStore } from '../entities/EntityStore.js';
import { GetQuery } from './GetQuery.js';
import { QueryCache } from './QueryCache.js';
import { FindOneQuery } from './FindOneQuery.js';
import { FindPageQuery } from './FindPageQuery.js';
import { FindInfiniteQuery } from './FindInfiniteQuery.js';
import { FindAllQuery } from './FindAllQuery.js';
import { DocumentManager } from '../DocumentManager.js';
import { ObjectEntity } from '../index.js';
import { UPDATE } from './BaseQuery.js';

export class CollectionQueries<
	T extends ObjectEntity<any, any>,
	Init,
	Filter extends CollectionFilter,
> {
	private cache;
	private collection;
	private hydrate: (oid: string) => Promise<T>;
	private context;
	private documentManager;

	put: (init: Init, options?: { undoable?: boolean }) => Promise<T>;
	delete: (id: string, options?: { undoable?: boolean }) => Promise<void>;
	deleteAll: (ids: string[], options?: { undoable?: boolean }) => Promise<void>;

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
		this.hydrate = entities.hydrate as any;
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
				new GetQuery<T>({
					id,
					collection: this.collection,
					hydrate: this.hydrate,
					context: this.context,
					key,
				}),
		);
	};

	findOne = ({
		index,
		key: providedKey,
	}: { index?: Filter; key?: string } = {}) => {
		const key =
			providedKey || `findOne:${this.collection}:${this.serializeIndex(index)}`;
		return this.cache.getOrSet(
			key,
			() =>
				new FindOneQuery<T>({
					index,
					collection: this.collection,
					hydrate: this.hydrate,
					context: this.context,
					key,
				}),
			(existing) => {
				existing[UPDATE](index);
			},
		);
	};

	findAll = ({
		index,
		key: providedKey,
	}: { index?: Filter; key?: string } = {}) => {
		const key =
			providedKey || `findAll:${this.collection}:${this.serializeIndex(index)}`;
		return this.cache.getOrSet(
			key,
			() =>
				new FindAllQuery<T>({
					index,
					collection: this.collection,
					hydrate: this.hydrate,
					context: this.context,
					key,
				}),
			(existing) => {
				existing[UPDATE](index);
			},
		);
	};

	findPage = ({
		index,
		pageSize,
		page,
		key: providedKey,
	}: {
		index?: Filter;
		pageSize: number;
		page: number;
		key?: string;
	}) => {
		const key =
			providedKey ||
			`findPage:${this.collection}:${this.serializeIndex(index)}:${pageSize}`;
		return this.cache.getOrSet(
			key,
			() =>
				new FindPageQuery<T>({
					index,
					collection: this.collection,
					hydrate: this.hydrate,
					context: this.context,
					key,
					pageSize,
					page,
				}),
			(existing) => {
				existing[UPDATE](index);
			},
		);
	};

	findAllInfinite = ({
		index,
		pageSize,
		key: providedKey,
	}: {
		index?: Filter;
		pageSize: number;
		key?: string;
	}) => {
		const key =
			providedKey ||
			`findAllInfinite:${this.collection}:${this.serializeIndex(
				index,
			)}:${pageSize}`;
		return this.cache.getOrSet(
			key,
			() =>
				new FindInfiniteQuery<T>({
					index,
					collection: this.collection,
					hydrate: this.hydrate,
					context: this.context,
					key,
					pageSize,
				}),
			(existing) => {
				existing[UPDATE](index);
			},
		);
	};
}
