import { Context } from '../context/context.js';
import { Disposable } from '../utils/Disposable.js';
import { BaseQuery, ON_ALL_UNSUBSCRIBED } from './BaseQuery.js';

export class QueryCache extends Disposable {
	private _cache: Map<string, BaseQuery<any>> = new Map();
	private _evictionTime;
	private context;
	/** A set of query keys to keep alive even if they unsubscribe */
	private _holds = new Set<string>();

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
		this.addDispose(
			this.context.internalEvents.subscribe(
				'persistenceReset',
				this.forceRefreshAll,
			),
		);
	}

	get activeKeys() {
		return Array.from(this._cache.keys());
	}

	get<T extends BaseQuery<any>>(key: string): T | null {
		return (this._cache.get(key) as T) || null;
	}

	set<V extends BaseQuery<any>>(value: V) {
		this._cache.set(value.key, value);
		value[ON_ALL_UNSUBSCRIBED](this.enqueueQueryEviction);
		// immediately enqueue a check to see if this query should be evicted --
		// this basically gives code X seconds to subscribe to the query before
		// it gets evicted.
		this.enqueueQueryEviction(value);

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
		this.context.log('debug', 'QueryCache: creating new query', key);
		return this.set(create());
	}

	private enqueueQueryEviction = (query: BaseQuery<any>) => {
		setTimeout(() => {
			if (query.subscribed) return;

			if (this._holds.has(query.key)) {
				this.context.log(
					'debug',
					'QueryCache: keepAlive hold on query preserves after unsubscribe',
					query.key,
				);
				return;
			}

			// double check before evicting... possible the cache
			// got a different version of this query.
			if (this._cache.get(query.key) === query) {
				this._cache.delete(query.key);
				this.context.log('debug', 'QueryCache: evicted query', query.key);
			}
		}, this._evictionTime);
	};

	dropAll = () => {
		this.context.log(
			'debug',
			'QueryCache: drop all',
			this._cache.size,
			'queries',
		);
		this._cache.forEach((query) => query.dispose());
		this._cache.clear();
	};

	forceRefreshAll = () => {
		this.context.log(
			'debug',
			'QueryCache: force refresh all',
			this._cache.size,
			'queries',
		);
		this._cache.forEach((q) => q.execute());
	};

	keepAlive(key: string) {
		this._holds.add(key);
		this.context.log('debug', 'QueryCache: keepAlive', key);
	}

	dropKeepAlive(key: string) {
		this._holds.delete(key);
		const cached = this.get(key);
		if (!cached) return;
		if (!cached.subscribed) {
			this.context.log(
				'debug',
				'QueryCache: dropKeepAlive on unsubscribed query; queuing eviction',
				key,
			);
			this.enqueueQueryEviction(cached);
		}
	}

	get keepAlives() {
		return this._holds;
	}
}

export type PublicQueryCacheAPI = Pick<
	QueryCache,
	| 'keepAlive'
	| 'dropKeepAlive'
	| 'keepAlives'
	| 'forceRefreshAll'
	| 'activeKeys'
>;
