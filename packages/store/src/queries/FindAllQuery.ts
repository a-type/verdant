import { CollectionFilter } from '@verdant-web/common';
import { BaseQuery, BaseQueryOptions, UPDATE } from './BaseQuery.js';
import { findAllOids } from './dbQueries.js';
import { areIndexesEqual } from './utils.js';

export class FindAllQuery<T> extends BaseQuery<T[]> {
	private index;
	private hydrate;

	constructor({
		index,
		hydrate,
		...rest
	}: {
		index?: CollectionFilter;
		hydrate: (oid: string) => Promise<T>;
	} & Omit<BaseQueryOptions<T[]>, 'initial'>) {
		super({
			initial: [],
			...rest,
		});
		this.index = index;
		this.hydrate = hydrate;
	}

	protected run = async () => {
		const oids = await findAllOids({
			collection: this.collection,
			index: this.index,
			context: this.context,
		});
		this.setValue(await Promise.all(oids.map(this.hydrate)));
	};

	[UPDATE] = (index: CollectionFilter | undefined) => {
		if (areIndexesEqual(this.index, index)) return;
		this.index = index;
		this.execute();
	};
}
