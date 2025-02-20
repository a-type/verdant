---
sidebar_position: 4
---

# Indexes & Querying

By default you can retrieve lists of all documents in a collection, or just one by its primary key.

To do more complex queries, you must create new indexes. Indexes are values that get re-computed from your document's data every time it's changed.

## Indexes

`indexes` are simple indexes which are computed from the data in a document. For example, if you want to index the field `done`, you could create an index for it:

```ts
const items = schema.collection({
	name: 'item',
	primaryKey: 'id',
	fields: {
		id: schema.fields.id(),
		done: schema.fields.boolean(),
	},
	indexes: {
		done: {
			field: 'done';
		}
	}
});
```

### Indexes with computation

You can process your document's data into an index value. This is an important and powerful concept which is the heart of making queries in Verdant in the same way that SQL is for relational databases.

To make a computed index, supply a `type` and `compute` property.

```ts
indexes: {
	likesWithMaxOf50: {
		type: 'number',
		compute: (post) => Math.min(post.likes, 50)
	}
}
```

This field won't be present on a todo item in your code, but it will be queryable.

You can use any synchronous logic you want to create synthetic indexes. But you should keep them deterministic! A non-deterministic index value will change whether a document matches a query every time you write to it.

#### Valid types of indexes

Indexes have different acceptable types from fields. Here's all the types you can use:

- `string`
- `number`
- `boolean`
- `string[]`
- `number[]`
- `boolean[]`

Basically, any primitive value or list of primitive values.

#### Using synthetic indexes for text search

You can do some basic text search using a simple synthetic index. The easiest version looks like this:

```ts
titleMatch: {
	type: 'string[]',
	compute: (post) => post.title.split(/\s+/)
}
```

This splits the text into words which make up the index value. When you have an array-type index value, the document will be returned if any of the generated values matches the filter.

So you can then search for text that includes a given word stem like so:

```ts
// will match posts with titles like: "fool's gold", "good food"
client.posts.findAll({
	index: {
		where: 'titleMatch',
		startsWith: 'foo',
	},
});
```

To reduce the index size, you can use a library like `stopword` to remove common words before indexing.

For fuzzier text matching, you might be able to create a sort of flat trie structure with some alternate stems for various words. I haven't tried anything that advanced, but a the end of the day all you need to do is produce an array of strings which partially match the filter text, so you can get creative!

#### Compound indexes

Compound indexes are a special case of synthetic index with more structure and query options. You can use them to query on two or more fields at once. For example, if you had a compound index

```ts
const items = schema.collection({
	name: 'item',
	primaryKey: 'id',
	fields: {
		id: schema.fields.id(),
		done: schema.fields.boolean(),
		details: schema.fields.string(),
	},
	compounds: {
		done_details: {
			of: ['done', 'details'],
		},
	},
});
```

you can query for items which are done, in alphabetical order by their details. This may be faster than querying only by `indexableDone` and then sorting in-memory. You can also match values of multiple properties - you could query for incomplete items called "wash dishes," for example.

Values in compound indexes will be coerced to strings automatically.

## Queries and mutations

You can use this client in your app now to store and query data. Use the root storage instance to create queries to find documents.

```ts
const firstDoneItemQuery = todos.todoItems.findOne({
	where: 'indexableDone',
	equals: 'true',
});

// subscribe to changes in the query
const unsubscribe = firstDoneItemQuery.subscribe((item) => {
	console.log(item);
});

// await the first resolved value
const oneDoneItem = await firstDoneItemQuery.resolved;

// modify a document
oneDoneItem.set('done', false);
```

Queries return query objects immediately with empty data. Await `.resolved` to get the final results, or use `query.subscribe(callback)` to subscribe to changes over time.

Queries also do not immediately run upon creation. They are lazy-loaded, so an actual query operation will not happen until you interact with the query, either by calling `.execute()`, accessing `.resolved`, or by attaching a callback with `.subscribe`.

To get the instantaneous current result (even if the query has not completed yet or is re-running), use `.current`. For single-entity queries, `.current` is `null` while the query is initializing. For list queries, it will be `[]`. You can access `.current` without triggering a lazy load of the query.

Queries also have a `.status` field to indicate their current status. `'initial'` means the query has not run yet. `'running'` means the query is fetching new results (but `.current` might still have valid data from a previous run). `'ready'` means the result set is up-to-date.

### Query caching

Queries have a caching behavior, determined by a cache key. Some queries automatically deduplicate: `get`, `findOne`, and `findAll`. Other queries don't deduplicate and cache unless you provide a custom cache key.

All cached queries are temporarily stored by default, so if you query the same thing twice in a matter of seconds it should only run once. Subscribed queries stay cached and update live until you unsubscribe all subscribers.

You can use `client.queries.activeKeys` to see which query keys are cached at any moment.

#### Cache key gotchas

Automatic cache key generation for queries which use an index filter is specific not just to the index name, but also the supplied value. In some programming environments, like Verdant's React integration, this means that queries which dynamically alter the filtered value change their key and therefore their cached identity. For example, using a string from an input which the user is actively typing in to filter by an index value rapidly constructs and then discards queries, but these queries will still run to completion before being disposed.

To prevent this waste, you should supply a custom query key to queries you expect to rapidly alter their input values.

#### Query keep-alives

Normally, if a query is not subscribed (by calling `.subscribe('change', ...)`) within 5 seconds, or 5 seconds after the last unsubscribe is called, it will be removed from the cache and garbage collected.

To prevent this, you can place a 'keep alive' hold on a query by its key. Using custom keys for this is highly recommended.

Call `client.queries.keepAlive(key)` to place a hold on a query.

Call `client.queries.dropKeepAlive(key)` to remove a hold.

Use `client.queries.keepAlives` to see which queries have a hold placed. This is a `Set`.

## Querying your indexes

Verdant generates typings for filters on the indexes you create on your collections. Explore the generated TypeScript definitions to see what your query options are.

Indexed fields and compound indexes generate exact and range query filters. Compound indexes generate match filters.

```ts
// field / synthetic filters:
export interface TodoIdMatchFilter {
	where: 'id';
	equals: string;
	order?: 'asc' | 'desc';
}

export interface TodoIdRangeFilter {
	where: 'id';
	gte?: string;
	gt?: string;
	lte?: string;
	lt?: string;
	order?: 'asc' | 'desc';
}

// compound filters:
export interface TodoTagsSortedByDoneCompoundFilter {
	where: 'tagsSortedByDone';
	match: {
		tags?: string;
		done?: boolean;
	};
	order: 'asc' | 'desc';
}
```

When using a compound filter, you must match values in the order they were specified in your `of` list. For example, if your `of` list was `['tags', 'done']`, you may not match `done` without also matching `tags` - but you can match `tags` alone, in which case items will be ordered by `done`.

TODO: more docs on how index queries work.

## Paginated queries

In addition to simple `get`, `findOne`, and `findAll` queries, which return the entire relevant dataset, you can make paginated queries to begin displaying large sets of data earlier and reduce memory footprint.

Keep in mind, though, that this database is local! Optimizations may not be necessary as early as they are on a server. Then again, IndexedDB is kind of slow, so just see how it feels.

There are two kinds of paginated queries: `findAllInfinite` and `findPage`.

### Infinite queries

Calling `findAllInfinite` will create an infinite-loader style query, where the result set gradually gets larger as you load new pages until you reach the end. This kind of query is ideal for quickly loading a subset of data to display, then gradually adding more if the user continues browsing or scrolling. It _can_ reduce memory usage in practice, but in principle you should assume the user will scroll to the end and design your app to handle this.

The query returned from `findAllInfinite` has two special properties for usage:

- `hasMore`: a boolean which is `true` if there are more pages to load
- `loadMore`: a function to call which expands the result set. Returns a promise for the load. The changes to the result set will also call any subscribed callback on the query.

#### Page queries

Calling `findPage` will create a paginated-style query, where each new loaded page of results replaces the previous page as the result set. This should keep memory footprint stable as you display different slices of a large result set.

The query returned from `findPage` has several special properties:

- `hasPreviousPage`: a boolean which is `true` if you can request the previous page (i.e. page > 0)
- `hasNextPage`: a boolean which is `true` if you can request the next page. Will be false if there are no more results for the query.
- `page`: the current page number. 0-based.
- `pageSize`: how many results are fetched in each page. Cannot be changed.
- `nextPage`: a function which can be called to move to the next page of results. Returns a promise for the operation. The page change will also call any callbacks used in `subscribe`. The result set (`current`) will be replaced with the new page of results.
- `previousPage`: a function which can be called to move to the previous page of results. Returns a promise for the operation. The page change will also call any callbacks used in `subscribe`. The result set (`current`) will be replaced with the new page of results.
- `setPage`: a function, like the other page change methods, but allows you to pass a specific page number (0-based). Note that passing a page number which is beyond the limit of the results set will end up with an empty array of results for the query.

## Manual cache keys

You can provide a custom cache key to `findPage`, `findAllInfinite`, `findOne` and `findAll` queries. Only the first two are recommended, though.

Providing a custom key to queries allows them to be cached independently of other queries with the same parameters. Without providing a custom cache key for repeated queries, the loaded state of each query will be the same in each place it's used. Usually this is a good thing, but not always for paginated queries. For example, if you go to page 2 on one screen of your app and navigate somewhere else where the same query and key are used, it will also now be on page 2. Same with the number of results loaded in an infinite query. To create two queries of the same parameters which don't share state like this, you need to provide a different cache key to one or both so they're not treated the same by the cache.

## Caveat: deleted entities

Deleting an entity does not currently refresh a query beyond removing that entity from the result set. This means that after deleting something from a paginated query, the page which contained that entity will be smaller by 1 than other pages until the query is next refreshed. This behavior may change in the future.
