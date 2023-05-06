import { createOid } from '@verdant/common';
import { BaseQuery, BaseQueryOptions } from './BaseQuery.js';

export class GetQuery<T> extends BaseQuery<T | null> {
	private hydrate;
	private oid;

	constructor({
		id,
		hydrate,
		...rest
	}: {
		id: string;
		hydrate: (oid: string) => Promise<T>;
	} & Omit<BaseQueryOptions<T | null>, 'initial'>) {
		super({
			initial: null,
			...rest,
		});
		this.oid = createOid(rest.collection, id, []);
		this.hydrate = hydrate;
	}

	protected run = async () => {
		const value = await this.hydrate(this.oid);
		this.setValue(value);
	};
}
