import { CollectionFilter } from '@verdant-web/common';
import { BaseQuery, BaseQueryOptions, UPDATE } from './BaseQuery.js';
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
		const { result: oids } = await this.context.queries.findAllOids({
			collection: this.collection,
			index: this.index,
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
