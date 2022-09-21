import { EventSubscriber } from './EventSubscriber.js';
import { computeSynthetics } from './synthetics.js';
import {
	getSortedIndex,
	CollectionEvents,
	CollectionIndexName,
	CollectionIndexFilter,
	CollectionSchemaComputedIndexes,
	isRangeIndexFilter,
	MatchCollectionIndexFilter,
	omit,
	RangeCollectionIndexFilter,
	ShapeFromFields,
	StorageCollectionSchema,
	StorageDocument,
	StorageDocumentWithComputedIndices,
	SyncPatch,
	createCompoundIndexValue,
	CompoundIndexValue,
	CollectionCompoundIndexFilter,
	CollectionFilter,
	isMatchIndexFilter,
	CollectionCompoundIndexName,
	createLowerBoundIndexValue,
	createUpperBoundIndexValue,
	CollectionCompoundIndex,
	createPatch,
	SyncOperation,
} from '@lofi/common';
import { Sync } from './Sync.js';
import { Meta } from './Meta.js';
import { cursorIterator, storeRequestPromise } from './idb.js';
import { QueryCache } from './reactives/QueryCache.js';
import { DocumentCache } from './reactives/DocumentCache.js';
import { getRaw, LiveDocument } from './reactives/LiveDocument.js';
import { TEST_API } from './constants.js';
import { LiveQuery } from './index.js';
import { LIVE_QUERY_SUBSCRIBE } from './reactives/LiveQuery.js';

export type CollectionInMemoryFilters<
	Collection extends StorageCollectionSchema<any, any, any>,
> = {
	/**
	 * This key must correspond to the filters being used.
	 * If you sort or filter in a different way but use the same key,
	 * the results will be wrong.
	 */
	key: string;
	filter?: (doc: StorageDocumentWithComputedIndices<Collection>) => boolean;
	sort?: (
		a: StorageDocumentWithComputedIndices<Collection>,
		b: StorageDocumentWithComputedIndices<Collection>,
	) => number;
};

export class StorageCollection<
	Collection extends StorageCollectionSchema<any, any, any>,
> {
	private events: EventSubscriber<CollectionEvents<Collection>> =
		new EventSubscriber();

	private queryCache = new QueryCache<Collection>();

	private applyLocalDocumentCacheOperations = async (
		ops: { documentId: string; patch: SyncPatch }[],
	) => {
		// TODO: apply multiple operations at once
		for (const { documentId, patch } of ops) {
			this.applyLocalOperation(
				await this.meta.createOperation({
					collection: this.name,
					documentId,
					patch,
				}),
			);
		}
	};
	private documentCache = new DocumentCache<Collection>(
		{
			applyOperations: this.applyLocalDocumentCacheOperations,
		},
		this.primaryKey,
	);

	constructor(
		private db: Promise<IDBDatabase>,
		private schema: Collection,
		private sync: Sync,
		private meta: Meta,
	) {}

	get name() {
		return this.schema.name;
	}

	private get primaryKey() {
		return this.schema.primaryKey;
	}

	private get syntheticIndexKeys(): (keyof CollectionSchemaComputedIndexes<Collection>)[] {
		return Object.keys(this.schema.synthetics);
	}

	private get compoundIndexKeys(): string[] {
		return Object.keys(this.schema.compounds);
	}

	get initialized(): Promise<void> {
		return Promise.all([this.db, this.meta.ready]).then();
	}

	private readTransaction = async () => {
		const db = await this.db;
		const transaction = db.transaction(this.name, 'readonly');
		const store = transaction.objectStore(this.name);
		return store;
	};

	private readWriteTransaction = async () => {
		const db = await this.db;
		const transaction = db.transaction(this.name, 'readwrite');
		const store = transaction.objectStore(this.name);
		return store;
	};

	private getLiveDocument = (
		storedDoc: StorageDocumentWithComputedIndices<Collection>,
	) => {
		return this.documentCache.get(this.stripComputedIndices(storedDoc));
	};

	/**
	 * Subscribes to a query, re-running it on change and returning the results.
	 * @param query A query to be updated on
	 * @param callback
	 */
	subscribe = <T>(
		query: LiveQuery<Collection, T>,
		callback: (value: T) => void,
	) => {
		const subscribedQuery = this.queryCache.add(query);
		const unsubscribe = subscribedQuery[LIVE_QUERY_SUBSCRIBE](callback);
		return () => {
			unsubscribe();
			// if no one is listening anymore, dispose it
			if (subscribedQuery.subscriberCount === 0) {
				queueMicrotask(() => {
					if (subscribedQuery.subscriberCount === 0) {
						console.debug('Cleaning up query', subscribedQuery);
						this.queryCache.delete(subscribedQuery.key);
					}
				});
			}
		};
	};

	get = (id: string) => {
		// check the cache for a version of this query
		// which already exists
		const key = this.queryCache.getKey('get', id);
		if (this.queryCache.has(key)) {
			return this.queryCache.get(key)!;
		}
		return new LiveQuery(
			key,
			async () => {
				const store = await this.readTransaction();
				const request = store.get(id);
				const result = await storeRequestPromise(request);
				if (!result) return null;
				return this.getLiveDocument(result);
			},
			this.events,
			// is PUT relevant? do we support getting by id before the id
			// is created? probably should.
			['put', 'delete'],
		);
	};

	findOne = <IndexName extends CollectionIndexName<Collection>>(
		filter: MatchCollectionIndexFilter<Collection, IndexName>,
	) => {
		const key = this.queryCache.getKey('findOne', filter);
		if (this.queryCache.has(key)) {
			return this.queryCache.get(key)!;
		}
		return new LiveQuery(
			key,
			async () => {
				const store = await this.readTransaction();
				const request = this.getIndexedListRequest(store, filter);
				let result: StorageDocumentWithComputedIndices<Collection> | undefined =
					undefined;
				await cursorIterator<StorageDocumentWithComputedIndices<Collection>>(
					request,
					(doc) => {
						if (doc) {
							result = doc;
							return false;
						}
						return true;
					},
				);
				if (!result) return null;
				return this.getLiveDocument(result);
			},
			this.events,
			['delete', 'put'],
		);
	};

	private rangeIndexToIdbKeyBound = (
		filter: RangeCollectionIndexFilter<
			Collection,
			CollectionIndexName<Collection>
		>,
	) => {
		const lower = filter.gte || filter.gt;
		const upper = filter.lte || filter.lt;
		if (!lower) {
			return IDBKeyRange.upperBound(upper, !!filter.lt);
		} else if (!upper) {
			return IDBKeyRange.lowerBound(lower, !!filter.gt);
		} else {
			return IDBKeyRange.bound(lower, upper, !!filter.gt, !!filter.lt);
		}
	};

	private matchIndexToIdbKeyRange = (
		filter: MatchCollectionIndexFilter<
			Collection,
			CollectionIndexName<Collection>
		>,
	) => {
		return IDBKeyRange.only(filter.equals as string | number);
	};

	private compoundIndexToIdbKeyRange = (
		filter: CollectionCompoundIndexFilter<
			Collection,
			CollectionIndexName<Collection>
		>,
	) => {
		// validate the usage of the compound index:
		// - all match fields must be contiguous at the start of the compound order
		const indexDefinition = this.schema.compounds[filter.where];
		const matchedKeys = Object.keys(filter.match).sort(
			(a, b) => indexDefinition.of.indexOf(a) - indexDefinition.of.indexOf(b),
		);
		for (const key of matchedKeys) {
			if (indexDefinition.of.indexOf(key) !== matchedKeys.indexOf(key)) {
				throw new Error(
					`Compound index ${filter.where} does not have ${key} at the start of its order`,
				);
			}
		}

		const matchedValues = matchedKeys.map(
			(key) =>
				filter.match[key as keyof typeof filter.match] as string | number,
		);

		// create our bounds for the matched values
		const lower = createLowerBoundIndexValue(...matchedValues);
		const upper = createUpperBoundIndexValue(...matchedValues);
		return IDBKeyRange.bound(lower, upper);
	};

	private getIndexedListRequest = <
		IndexName extends CollectionIndexName<Collection>,
	>(
		store: IDBObjectStore,
		index?: CollectionFilter<Collection, IndexName>,
	) => {
		if (!index) return store.openCursor();
		const indexName = index.where;
		const range = isRangeIndexFilter(index)
			? this.rangeIndexToIdbKeyBound(index)
			: isMatchIndexFilter(index)
			? this.matchIndexToIdbKeyRange(index)
			: this.compoundIndexToIdbKeyRange(index);
		console.log(range, indexName);
		return store
			.index(indexName)
			.openCursor(range, index.order === 'desc' ? 'prev' : 'next');
	};
	getAll = <IndexName extends CollectionIndexName<Collection>>(
		index?: CollectionFilter<Collection, IndexName>,
		/**
		 * The secondary filtering allows in-memory filtering
		 * which is applied while the cursor is being iterated,
		 * which may be more efficient than filtering afterward.
		 */
		filters?: CollectionInMemoryFilters<Collection>,
	) => {
		const key = this.queryCache.getKey('getAll', index, filters);
		if (this.queryCache.has(key)) {
			return this.queryCache.get(key)! as LiveQuery<
				Collection,
				LiveDocument<StorageDocument<Collection>>[]
			>;
		}
		const filter = filters?.filter;
		const sort = filters?.sort;
		return new LiveQuery(
			key,
			async () => {
				const store = await this.readTransaction();
				const request = this.getIndexedListRequest(store, index);
				const results: StorageDocument<Collection>[] = [];
				await cursorIterator<StorageDocumentWithComputedIndices<Collection>>(
					request,
					(item) => {
						// skip empty docs
						if (!item) return true;

						// if no filter or filter matches, add to results
						if (!filter || filter(item)) {
							// sort the insertion if a sort is provided
							if (sort) {
								// find the index to insert the item using binary search
								const index = getSortedIndex(results, item, sort);
								results.splice(index, 0, item);
							} else {
								// otherwise just push to end
								results.push(item);
							}
						}

						// always keep going
						return true;
					},
				);
				return results.map((raw) => this.getLiveDocument(raw));
			},
			this.events,
			['delete', 'put'],
		);
	};

	/**
	 * Diffs the two versions of the document, removes synthetics, and returns a patch.
	 */
	private createDiffPatch = (
		from: Partial<StorageDocument<Collection>>,
		to: StorageDocument<Collection>,
	): SyncPatch => {
		return createPatch(
			omit(from, this.syntheticIndexKeys),
			omit(to, this.syntheticIndexKeys),
		);
	};

	update = async (
		id: string,
		data: Partial<ShapeFromFields<Collection['fields']>>,
	) => {
		const current = await this.get(id).resolved;
		if (!current) {
			throw new Error(`No document with id ${id}`);
		}

		const rawCurrent = getRaw(current) as StorageDocument<Collection>;

		const updated = {
			...rawCurrent,
			...data,
		};

		const patch = this.createDiffPatch(rawCurrent, updated);

		if (!patch.length) {
			return current;
		}

		const op = await this.meta.createOperation({
			collection: this.name,
			documentId: id,
			patch,
		});
		const final = await this.applyLocalOperation(op);

		return final!;
	};

	create = async (data: ShapeFromFields<Collection['fields']>) => {
		const op = await this.meta.createOperation({
			collection: this.name,
			documentId: data[this.primaryKey] as string,
			patch: this.createDiffPatch({}, data),
		});
		const final = await this.applyLocalOperation(op);

		// non-null assertion - we know it's not deleted if we just created it,
		// right?
		return final!;
	};

	upsert = async (data: ShapeFromFields<Collection['fields']>) => {
		const id = data[this.primaryKey] as string;
		const current = await this.get(id).resolved;
		if (current) {
			return this.update(id, data);
		}
		return this.create(data);
	};

	delete = async (id: string) => {
		const op = await this.meta.createOperation({
			collection: this.name,
			documentId: id,
			patch: 'DELETE',
		});
		await this.applyLocalOperation(op);
	};

	deleteAll = async (ids: string[]) => {
		return Promise.all(ids.map((id) => this.delete(id)));
	};

	// unchecked types, these field names are highly dynamic and not
	// visible to external consumers
	private computeCompoundIndices = (
		doc: StorageDocumentWithComputedIndices<Collection>,
	): any => {
		return Object.entries(this.schema.compounds).reduce<
			Record<string, CompoundIndexValue>
		>((acc, [indexKey, index]) => {
			acc[indexKey] = createCompoundIndexValue(
				...(index as CollectionCompoundIndex<any, any>).of.map(
					(key) => doc[key] as string | number,
				),
			);
			return acc;
		}, {} as Record<string, CompoundIndexValue>);
	};
	private applyIndices = (
		fields: ShapeFromFields<Collection['fields']>,
	): StorageDocumentWithComputedIndices<Collection> => {
		const withSynthetics: StorageDocumentWithComputedIndices<Collection> = {
			...fields,
			...computeSynthetics(this.schema, fields),
		};
		Object.assign(withSynthetics, this.computeCompoundIndices(withSynthetics));
		return withSynthetics;
	};

	private stripComputedIndices = (
		doc: StorageDocumentWithComputedIndices<Collection>,
	): StorageDocument<Collection> => {
		return omit(doc, [
			...this.syntheticIndexKeys,
			...this.compoundIndexKeys,
		]) as any;
	};

	/** Sync Methods */

	private applyLocalOperation = async (operation: SyncOperation) => {
		// optimistic application
		const oldestHistoryTimestamp = await this.meta.insertLocalOperation(
			operation,
		);
		// TODO: should local ops be acked?
		await this.meta.ack(operation.timestamp);
		const result = this.recomputeDocument(operation.documentId);

		// sync to network
		this.sync.send({
			type: 'op',
			replicaId: operation.replicaId,
			op: {
				collection: operation.collection,
				documentId: operation.documentId,
				id: operation.id,
				patch: operation.patch,
				replicaId: operation.replicaId,
				timestamp: operation.timestamp,
			},
			oldestHistoryTimestamp,
		});

		return result;
	};

	applyRemoteOperation = async (operation: SyncOperation) => {
		// to apply an operation we have to first insert it in the operation
		// history, then lookup and reapply all operations for that document
		// to the baseline.

		await this.meta.insertOperation(operation);
		await this.meta.ack(operation.timestamp);
		return this.recomputeDocument(operation.documentId);
	};

	recomputeDocument = async (
		id: string,
	): Promise<StorageDocument<Collection> | undefined> => {
		const updatedView = await this.meta.getComputedView(this.name, id);

		// undefined means the document was deleted
		if (updatedView === undefined) {
			const store = await this.readWriteTransaction();
			const request = store.delete(id);
			await storeRequestPromise(request);

			// emit events for this change
			this.events.emit('delete', id);
			this.events.emit(`delete:${id}`);

			this.documentCache.assign(id, null);

			return undefined;
		} else {
			// write the new view to the document
			const store = await this.readWriteTransaction();
			// apply computed indices to the document before
			// storing
			const updatedWithComputed = this.applyIndices(updatedView);
			const request = store.put(updatedWithComputed);
			await storeRequestPromise(request);

			this.documentCache.assign(id, updatedView);

			this.events.emit('put', updatedView);
			this.events.emit(`put:${id}`, updatedView);

			return updatedView;
		}
	};

	rebaseDocument = async (id: string, upTo: string) => {
		const squashed = await this.meta.rebase(this.name, id, upTo);
	};

	stats = () => {
		return {
			caches: {
				...this.documentCache.stats(),
				...this.queryCache.stats(),
			},
		};
	};

	[TEST_API] = {
		getAllRaw: async (): Promise<any[]> => {
			const store = await this.readWriteTransaction();
			const request = store.getAll();
			return storeRequestPromise(request);
		},
	};
}
