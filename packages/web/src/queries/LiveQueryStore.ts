import { Context } from '../context.js';
import { ObjectEntity } from '../index.js';
import { EntityStore } from '../reactives/EntityStore.js';
import { LiveQuery, UPDATE } from './LiveQuery.js';
import { BaseQueryStore, QueryParams, QueryStore } from './QueryStore.js';

export class LiveQueryStore<
	Result extends (ObjectEntity<any, any> | null) | ObjectEntity<any, any>[] =
		| (ObjectEntity<any, any> | null)
		| ObjectEntity<any, any>[],
> implements BaseQueryStore<LiveQuery<Result>>
{
	private queries: QueryStore<any>;
	private cache = new Map<string, LiveQuery<any>>();

	private _unsubscribes: (() => void)[] = [];

	constructor(private entities: EntityStore, private context: Context) {
		this.queries = new QueryStore(entities.get, context);
		this._unsubscribes.push(
			this.entities.subscribe('collectionsChanged', this.onCollectionsChanged),
		);
	}

	setContext = (context: Context) => {
		this.context = context;
		this.queries.setContext(context);
	};

	getQueryKey(params: QueryParams): string {
		return this.queries.getQueryKey(params);
	}

	get = (config: {
		collection: string;
		range: IDBKeyRange | IDBValidKey | undefined;
		index?: string;
		direction?: IDBCursorDirection;
		limit?: number;
		single?: boolean;
		write?: boolean;
	}) => {
		const key = this.queries.getQueryKey(config);
		if (this.cache.has(key)) {
			return this.cache.get(key)!;
		}

		const baseQuery = this.queries.get(config);
		const liveQuery = new LiveQuery(
			baseQuery,
			(query) => {
				const cached = this.cache.get(key);
				if (cached && cached !== query) {
					console.warn(
						'Query already exists in cache for key',
						key,
						', this is not an error but suggests your code is creating multiple queries of the same type in the same frame and subscribing to them, and will produce less efficient memory usage.',
					);
				}
				this.cache.set(key, query);
			},
			(query) => {
				this.prepareToCleanupQuery(query);
			},
		);
		this.cache.set(key, liveQuery);
		this.prepareToCleanupQuery(liveQuery);
		return liveQuery;
	};

	/**
	 * If a query is unsubscribed after 1 tick, it is removed from the cache.
	 * To persist a query in the cache a user must subscribe to it.
	 */
	private prepareToCleanupQuery = (query: LiveQuery<any>) => {
		setTimeout(() => {
			if (!query.isActive) {
				const cached = this.cache.get(query.key);
				if (cached === query) {
					this.cache.delete(query.key);
				}
			}
		}, 3000);
	};

	update = (key: string) => {
		this.cache.get(key)?.[UPDATE]();
	};

	updateAll = () => {
		for (const query of this.cache.values()) {
			query[UPDATE]();
		}
	};

	private onCollectionsChanged = (collections: string[]) => {
		let updated = 0;
		// FIXME: This is a naive implementation, improve beyond O(n)
		for (const [key, query] of this.cache) {
			if (collections.includes(query.collection)) {
				query[UPDATE]();
				updated++;
				this.context.log('🔄 updated query', key);
			}
		}
	};

	destroy = () => {
		this.queries.dispose();
		this._unsubscribes.forEach((unsubscribe) => unsubscribe());
		for (const query of this.cache.values()) {
			query.dispose();
		}
		this.cache.clear();
	};
}
