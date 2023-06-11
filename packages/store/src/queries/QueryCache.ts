import { Context } from '../context.js';
import { Disposable } from '../utils/Disposable.js';
import { BaseQuery, ON_ALL_UNSUBSCRIBED } from './BaseQuery.js';

export class QueryCache extends Disposable {
	private _cache: Map<string, BaseQuery<any>> = new Map();
	private _evictionTime;
	private context;

	constructor({
		evictionTime = 5 * 1000,
		context,
	}: {
		evictionTime?: number;
		context: Context;
	}) {
		super();

		this._evictionTime = evictionTime;
		this.context = context;
	}

	get<T extends BaseQuery<any>>(key: string): T | null {
		return (this._cache.get(key) as T) || null;
	}

	set<V extends BaseQuery<any>>(value: V) {
		this._cache.set(value.key, value);
		value[ON_ALL_UNSUBSCRIBED](this.onQueryUnsubscribed);
		return value;
	}

	getOrSet<V extends BaseQuery<any>>(
		key: string,
		create: () => V,
		update?: (query: V) => void,
	) {
		const existing = this.get<V>(key);
		if (existing) {
			update?.(existing);
			return existing;
		}
		return this.set(create());
	}

	private onQueryUnsubscribed = (query: BaseQuery<any>) => {
		setTimeout(() => {
			if (query.subscribed) return;
			// double check before evicting... possible the cache
			// got a different version of this query.
			if (this._cache.get(query.key) === query) {
				this._cache.delete(query.key);
			}
		}, this._evictionTime);
	};
}
