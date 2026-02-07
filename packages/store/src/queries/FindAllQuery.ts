import { CollectionFilter } from '@verdant-web/common';
import { BaseQuery, BaseQueryOptions, UPDATE } from './BaseQuery.js';
import { areIndexesEqual } from './utils.js';

export class FindAllQuery<T> extends BaseQuery<T[]> {
	private index;
	private hydrate;
	private limit;

	constructor({
		index,
		hydrate,
		limit,
		...rest
	}: {
		index?: CollectionFilter;
		hydrate: (oid: string) => Promise<T>;
		limit?: number;
	} & Omit<BaseQueryOptions<T[]>, 'initial'>) {
		super({
			initial: [],
			...rest,
		});
		this.limit = limit;
		this.index = index;
		this.hydrate = hydrate;
	}

	protected run = async () => {
		const { result: oids } = await (
			await this.context.documents
		).findAllOids({
			collection: this.collection,
			index: this.index,
			limit: this.limit,
		});
		this.context.log(
			'debug',
			`FindAllQuery: ${oids.length} oids found: ${oids}`,
		);
		this.setValue(await Promise.all(oids.map(this.hydrate)));
	};

	[UPDATE] = (index: CollectionFilter | undefined) => {
		if (areIndexesEqual(this.index, index)) return;
		this.index = index;
		this.execute();
	};
}
