import {
	CollectionCompoundIndexFilter,
	CollectionEvents,
	CollectionIndexFilter,
	StorageCollectionSchema,
	StorageDocument,
} from '@lofi/common';
import { EventSubscriber } from '../EventSubscriber.js';
import { CollectionInMemoryFilters } from '../StorageCollection.js';
import { LiveDocument } from './LiveDocument.js';
import { LiveQuery, LIVE_QUERY_ACTIVATE } from './LiveQuery.js';

function orderedReplacer(_: any, v: any) {
	if (typeof v !== 'object' || v === null || Array.isArray(v)) {
		return v;
	}
	return Object.fromEntries(
		Object.entries(v).sort(([ka], [kb]) => (ka < kb ? -1 : ka > kb ? 1 : 0)),
	);
}
function hashIndex(filter: any) {
	return JSON.stringify(filter, orderedReplacer);
}

export class QueryCache<
	Collection extends StorageCollectionSchema<any, any, any>,
> {
	private queries: Map<string, LiveQuery<Collection, any>> = new Map();
	private disposes: Map<string, () => void> = new Map();

	getKey = (
		type: 'get' | 'findOne' | 'getAll',
		index?:
			| CollectionIndexFilter<Collection, any>
			| string
			| CollectionCompoundIndexFilter<Collection, any>,
		filter?: CollectionInMemoryFilters<Collection>,
	) => {
		return `${type}_${index ? hashIndex(index) : ''}_${filter?.key || ''}`;
	};

	add = (query: LiveQuery<Collection, any>) => {
		if (this.queries.has(query.key)) {
			return this.queries.get(query.key)!;
		}
		this.queries.set(query.key, query);
		// subscribe to database changes
		this.disposes.set(query.key, query[LIVE_QUERY_ACTIVATE]());
		return query;
	};

	has = (key: string) => {
		return this.queries.has(key);
	};

	get = (key: string) => {
		return this.queries.get(key);
	};

	delete = (key: string) => {
		if (this.queries.has(key)) {
			this.queries.delete(key);
		}
		const dispose = this.disposes.get(key);
		if (dispose) {
			dispose();
			this.disposes.delete(key);
		}
	};

	stats = () => {
		return {
			queryCount: this.queries.size,
		};
	};
}
