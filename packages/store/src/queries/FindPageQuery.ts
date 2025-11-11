import { CollectionFilter } from '@verdant-web/common';
import { BaseQuery, BaseQueryOptions, UPDATE } from './BaseQuery.js';
import { areIndexesEqual } from './utils.js';

export class FindPageQuery<T> extends BaseQuery<T[]> {
	private index;
	private hydrate;
	private _pageSize: number;
	private _page: number;
	private _hasNextPage: boolean = false;

	get pageSize() {
		return this._pageSize;
	}

	get page() {
		return this._page;
	}

	get hasNextPage() {
		return this._hasNextPage;
	}

	get hasPreviousPage() {
		return this._page > 0;
	}

	constructor({
		index,
		hydrate,
		pageSize,
		page,
		...rest
	}: {
		index?: CollectionFilter;
		hydrate: (oid: string) => Promise<T>;
		pageSize: number;
		page: number;
	} & Omit<BaseQueryOptions<T[]>, 'initial'>) {
		super({
			initial: [],
			...rest,
		});
		this.index = index;
		this.hydrate = hydrate;
		this._pageSize = pageSize;
		this._page = page;
	}

	protected run = async () => {
		const { result, hasNextPage } = await (
			await this.context.documents
		).findAllOids({
			collection: this.collection,
			index: this.index,
			limit: this._pageSize,
			offset: this._page * this._pageSize,
		});
		this._hasNextPage = hasNextPage;
		this.setValue(await Promise.all(result.map(this.hydrate)));
	};

	nextPage = async () => {
		if (!this.hasNextPage) return;

		this._page++;
		await this.run();
	};

	previousPage = async () => {
		if (this._page === 0) return;

		this._page--;
		await this.run();
	};

	setPage = async (page: number) => {
		this._page = page;
		await this.run();
	};

	[UPDATE] = (index: CollectionFilter | undefined) => {
		if (areIndexesEqual(this.index, index)) return;
		this.index = index;
		this.execute();
	};
}
