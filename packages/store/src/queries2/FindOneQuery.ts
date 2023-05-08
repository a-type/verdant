import { CollectionFilter } from '@verdant-web/common';
import { Context } from '../context.js';
import { BaseQuery, BaseQueryOptions } from './BaseQuery.js';
import { findOneOid } from './dbQueries.js';

export class FindOneQuery<T> extends BaseQuery<T | null> {
	private index;
	private hydrate;

	constructor({
		index,
		hydrate,
		...rest
	}: {
		index?: CollectionFilter;
		hydrate: (oid: string) => Promise<T>;
	} & Omit<BaseQueryOptions<T | null>, 'initial'>) {
		super({
			initial: null,
			...rest,
		});
		this.index = index;
		this.hydrate = hydrate;
	}

	protected run = async () => {
		const oid = await findOneOid({
			collection: this.collection,
			index: this.index,
			context: this.context,
		});
		this.setValue(oid ? await this.hydrate(oid) : null);
	};
}
