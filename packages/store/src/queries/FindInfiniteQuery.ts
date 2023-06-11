import { CollectionFilter } from '@verdant-web/common';
import { BaseQuery, BaseQueryOptions, UPDATE } from './BaseQuery.js';
import { findPageOfOids } from './dbQueries.js';
import { areIndexesEqual } from './utils.js';

export class FindInfiniteQuery<T> extends BaseQuery<T[]> {
	private index;
	private hydrate;
	private _upToPage = 1;
	private _pageSize: number;
	private _hasNextPage: boolean = false;

	get pageSize() {
		return this._pageSize;
	}

	get hasMore() {
		return this._hasNextPage;
	}

	constructor({
		hydrate,
		pageSize,
		index,
		...rest
	}: {
		hydrate: (oid: string) => Promise<T>;
		pageSize: number;
		index?: CollectionFilter;
	} & Omit<BaseQueryOptions<T[]>, 'initial'>) {
		super({
			initial: [],
			...rest,
		});
		this.index = index;
		this.hydrate = hydrate;
		this._pageSize = pageSize;
	}

	protected run = async () => {
		const { result, hasNextPage } = await findPageOfOids({
			collection: this.collection,
			context: this.context,
			limit: this._pageSize * this._upToPage,
			offset: 0,
			index: this.index,
		});
		this._hasNextPage = hasNextPage;
		this.setValue(await Promise.all(result.map(this.hydrate)));
	};

	public loadMore = async () => {
		const { result, hasNextPage } = await findPageOfOids({
			collection: this.collection,
			context: this.context,
			limit: this._pageSize,
			offset: this._pageSize * this._upToPage,
			index: this.index,
		});
		this._hasNextPage = hasNextPage;
		this._upToPage++;
		this.setValue([
			...this.current,
			...(await Promise.all(result.map(this.hydrate))),
		]);
	};

	[UPDATE] = (index: CollectionFilter | undefined) => {
		if (areIndexesEqual(this.index, index)) return;
		this.index = index;
		this.execute();
	};
}
