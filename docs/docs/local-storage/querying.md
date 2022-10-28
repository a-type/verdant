---
sidebar_position: 4
---

# Indexes & Querying

By default you can retrieve lists of all documents in a collection, or just one by its primary key.

To do more complex queries, you must index fields or create new indexes.

#### Indexing existing fields

For field types which support indexing (string, number), add `indexed: true` to index that field. This enables quick lookup by specific value, or by range.

#### Synthetic indexes

`synthetics` are additional indexes which are computed from the data in a document. For example, if you _did_ want to index the boolean field `done`, you could create a synthetic index which converts it to a string:

```ts
synthetics: {
  indexableDone: {
    type: 'string',
    compute: (item) => item.done.toString()
  }
}
```

This field won't be present on a todo item in your code, but it will be queryable.

You can use any synchronous logic you want to create synthetic indexes. But you should keep them deterministic!

#### Compound indexes

Compound indexes are a special case of synthetic index with more structure and query options. You can use them to query on two or more fields at once. For example, if you had a compound index

```
compounds: {
  done_details: {
    of: ['done', 'details']
  }
}
```

you can query for items which are done, in alphabetical order by their details. This may be faster than querying only by `indexableDone` and then sorting in-memory. You can also match values of multiple properties - you could query for incomplete items called "wash dishes," for example.

Values in compound indexes will be coerced to strings automatically.

#### Queries and mutations

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

There are a few quirks to usage:

- Queries return query objects immediately with empty data. Await `.resolved` to get the final results, or use `query.subscribe(callback)` to subscribe to changes over time.
- Subscribed queries stay in memory and update until you unsubscribe all subscribers
- Subscribed queries of the same kind are cached - if you query the same exact thing twice, you'll get back the original query _if it has been subscribed_. Queries are only disposed when all subscribers leave.

#### Querying your indexes

lo-fi generates typings for filters on the indexes you create on your collections. Explore the generated TypeScript definitions to see what your query options are.

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
