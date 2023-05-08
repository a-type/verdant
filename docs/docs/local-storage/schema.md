---
sidebar_position: 1
---

# Creating a schema

The first step client-side is to define a schema of what kind of documents you are working with. A schema looks like this:

```ts
import { collection, schema } from '@verdant-web/store';

const todoItems = collection({
	name: 'todoItem',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
			indexed: true,
			unique: true,
		},
		details: {
			type: 'string',
			indexed: false,
			unique: false,
		},
		done: {
			type: 'boolean',
		},
	},
	synthetics: {},
	compounds: {},
});

export default schema({
	version: 1,
	collections: {
		todoItems: todoItems,
	},
});
```

This schema creates 1 document type, `todoItem`, and defines some fields. It also creates the initial default migration to set up this schema in IndexedDB.

The TypeScript types for `collection` should enforce proper schema shape. Note that the `boolean` field type, which is not indexable in IndexedDB, does not allow specifying `indexed` (for example).
