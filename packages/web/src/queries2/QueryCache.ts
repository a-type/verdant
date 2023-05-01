import { Context } from '../context.js';
import { EntityStore } from '../reactives/EntityStore.js';
import { Disposable } from '../utils/Disposable.js';
import { BaseQuery, ON_ALL_UNSUBSCRIBED, UPDATE } from './BaseQuery.js';

export class QueryCache extends Disposable {
	private _cache: Map<string, BaseQuery<any>> = new Map();
	private _evictionTime;
	private context;

	constructor({
		evictionTime = 5 * 1000,
		context,
		entities,
	}: {
		evictionTime?: number;
		context: Context;
		entities: EntityStore;
	}) {
		super();

		this._evictionTime = evictionTime;
		this.context = context;
		this.addDispose(
			entities.subscribe('collectionsChanged', this.onCollectionsChanged),
		);
	}

	get<T extends BaseQuery<any>>(key: string): T | null {
		return (this._cache.get(key) as T) || null;
	}

	set<V extends BaseQuery<any>>(value: V) {
		this._cache.set(value.key, value);
		value[ON_ALL_UNSUBSCRIBED](this.onQueryUnsubscribed);
		return value;
	}

	getOrSet<V extends BaseQuery<any>>(key: string, create: () => V) {
		const existing = this.get<V>(key);
		if (existing) return existing;
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

	private onCollectionsChanged = (collections: string[]) => {
		let updated = 0;
		// FIXME: This is a naive implementation, improve beyond O(n)
		for (const [key, query] of this._cache) {
			if (collections.includes(query.collection)) {
				query[UPDATE]();
				updated++;
				this.context.log('🔄 updated query', key);
			}
		}
	};
}
