import { CollectionFilter } from '@verdant-web/common';
import { BaseQuery, BaseQueryOptions, UPDATE } from './BaseQuery.js';
import { areIndexesEqual } from './utils.js';

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
		const oid = await (
			await this.context.documents
		).findOneOid({
			collection: this.collection,
			index: this.index,
		});
		this.setValue(oid ? await this.hydrate(oid) : null);
	};

	[UPDATE] = (index: CollectionFilter | undefined) => {
		if (areIndexesEqual(this.index, index)) return;
		this.index = index;
		this.execute();
	};
}
