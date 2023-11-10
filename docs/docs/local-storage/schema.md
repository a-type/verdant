---
sidebar_position: 1
---

# Why have a schema?

Verdant requires all data be defined in a schema. That may seem cumbersome, but knowing what data looks like is essential to changing the shape of that data over time as your app evolves. Data lives on user devices, not your servers, so getting migrations right is very important&mdash;data loss or corruption can be unrecoverable, and no backups exist.

Take the time to think about how you model your data and define it in your schema. Mistakes in local-first apps are costly!

# Creating a schema

The first step client-side is to define a schema of what kind of documents you are working with. A schema looks like this:

```ts
import { collection, schema } from '@verdant-web/store';

const todoItems = collection({
	name: 'todoItem',
	// your primary key must be a field in your collection,
	// and you must not rewrite it after creating a document.
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
	indexes: {},
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

The TypeScript types for `collection` should enforce proper schema shape, but the docs below explain what each part means.

## Requirements for a schema

Each schema needs a `version`. Whenever a change is made to the schema, the version must be incremented. Otherwise, Verdant will crash with an error.

Schemas also have a map of `collections`. These define what kinds of documents are stored in your database.

## Requirements for a collection

Each collection needs the following:

- `name`: a singular name for the collection.
- `primaryKey`: specify which field name acts as the primary document key. Must be a string or number field.
- `fields`: a map of root fields on the document. See below.

Additionally, you can add complex indexes for querying the collection:

- `indexes`: freeform indexes which process the document into one indexed value (or an array of values) whenever it changes.
- `compounds`: multi-value indexes which let you query multiple field values at once. Advanced feature.

See more on indexes [here](./querying.md).

## Types of fields

Here's a list of field `type`s you can use in a collection, and their related options.

### `'string'`

Defines a string field, as you'd expect.

Other options:

- `nullable: true`: allows `null` as a valid value for this field.
- `default: string | (() => string)`: define a default value, or a function that returns a default value at create time.

### `'number'`

Defines a number field, as you'd expect.

Other options:

- `nullable: true`: allows `null` as a valid value for this field.
- `default: number | (() => number)`: define a default value, or a function that returns a default value at create time.

### `'boolean'`

Defines a boolean field, as you'd expect.

Other options:

- `nullable: true`: allows `null` as a valid value for this field.
- `default: boolean | (() => boolean)`: define a default value, or a function that returns a default value at create time.

### `'array'`

Defines an array/list field. These can also act as sets. Arrays always default to empty.

Other options:

- `items: FieldSchema`: a nested field schema definition which defines what each item in the array looks like.
- `nullable: true`: allows `null` as a valid value for this field.

### `'object'`

Defines an object/record field. Objects always default to empty. Objects have statically-defined keys, each of which can have its own unique sub-schema. For maps where keys aren't known until runtime, see `'map'`.

Other options:

- `properties: { [Key: string]: FieldSchema }`: an object of key->value pairs, where values are nested field schema definitions which defines what kind of data exists on that key.
- `nullable: true`: allows `null` as a valid value for this field.

### `'map'`

Defines a key-value map field, where keys are arbitrary and added at runtime, and values are given a known schema. Maps are never nullable and default empty.

Other options:

- `values: FieldSchema`: defines the sub-schema for values in the map.

### `'file'`

Defines a file field, which stores a file.

Other options:

- `nullable: true`: allows `null` as a valid value for this field.
- `downloadRemote: true`: instructs the client to download and store file fields which are synced from other devices. By default, the client will instead load the file over the network. Using this is a tradeoff which enables offline file usage, but increases storage use.

### `'any'`

Opts out of schema checking for a field. An `any` field can have nested data and can be used just like any other field, but no TypeScript types will be applied, and no runtime validation will occur (note: runtime validation doesn't currently exist, anyway...)

Other options:

- `default: any | (() => any)`: define a default value for this field

## Indexing Fields

In earlier versions of Verdant, you could index a field by adding `indexed: true` to it. To consolidate indexing, Verdant now requires all indexes to be specified in `indexes` or `compounds`. There's a new index definition to easily index a single field (with typechecking): `{ field: 'fieldName' }`, which you can use instead.
