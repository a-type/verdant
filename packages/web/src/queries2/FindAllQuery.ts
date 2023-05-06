import { CollectionFilter } from '@verdant/common';
import { Context } from '../context.js';
import { findAllOids } from './dbQueries.js';
import { BaseQuery, BaseQueryOptions } from './BaseQuery.js';

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
}
