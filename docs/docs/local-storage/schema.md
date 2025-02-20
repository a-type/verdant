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

> Note: for now I recommend you define collections at the top level, like shown above, or even split them into their own modules. There's a problem with TypeScript typings if you define collections inline inside `schema()`.

## Requirements for a schema

Each schema needs a `version`. Whenever a change is made to the schema, the version must be incremented. Otherwise, Verdant will crash with an error.

Schemas also have a map of `collections`. These define what kinds of documents are stored in your database.

Your schema can be multiple files, but the entry file (which you provide to the CLI) must have a default export which is a `schema()`.

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

## Recursive Fields

It is currently possible to create recursive field schemas. Support is still experimental and the syntax for doing so is rather tedious, but once done, fields should be properly typed and validated.

To define recursive schema structures, you must first define a 'base' schema field assigned to a variable, then modify that field to assign its own reference to one of its nested structures. This two-step process is necessary because otherwise we'd encounter a "used before it was defined" type of error.

```ts
const contentBase = schema.fields.object({
	// NOTE: it doesn't matter what you put here, as this will be replaced
	// with the proceeding use of replaceObjectFields
	fields: {},
});

// a manual typing of the field is required as Typescript cannot
// infer recursive types. These "Storage__FieldSchema" types can all be
// imported from '@verdant-web/store'.
type NestedContentFieldSchema = StorageObjectFieldSchema<{
	type: StorageStringFieldSchema;
	content: StorageArrayFieldSchema<NestedContentFieldSchema>;
}>;

const nestedContent: NestedContentFieldSchema =
	schema.fields.replaceObjectFields(contentBase, {
		content: schema.fields.array({
			// our recursive reference. use the original 'base' variable.
			items: contentBase,
		}),
		// other fields should be added here as well.
		type: schema.fields.string(),
	});
// you can now assign `nestedContent` to a collection field in your schema.
const post = schema.collection({
	name: 'post',
	primaryKey: 'id',
	fields: {
		id: schema.fields.id(),
		body: nestedContent,
	},
});
```

The call to `replaceObjectFields` reassigns the `fields` of the object field schema and updates the typing to reflect the recursion. The returned schema from this function has an `any` applied type; you must manually typecast the returned variable using a custom defined field schema type as shown (Typescript cannot infer this for you).

Once this is done, typings should still work when accessing recursive fields for index computation, and the CLI should generate appropriately defined named types for fields. For example, from the above code, a named alias type for `PostBodyContent` would be created which would be defined as `PostBody[]`.

### Available `replace` field helpers for recursion

Helpers are available not just for object fields, but all field types which nest and can therefore produce recursion:

- `replaceObjectFields(objSchema, newFieldsSchema)`
- `replaceArrayItems(arraySchema, newItemSchema)`
- `replaceMapValues(mapSchema, newValueSchema)`

### Limitations

You must not reuse a recursive field schema for multiple fields! When detecting cyclical references in the schema, only the first reference is captured as 'canonical,' so multiple reuses will all point to the first detected use. This will result in odd or incorrect generated typings from the CLI.

Instead, you must define each recursive field schema as a separate declaration. If you want identical field schemas for multiple fields, consider making a helper function which constructs your recursive field structure and then calling that multiple times to assign to new variables.

```ts
const postBody = makeNestedContentField();
const commentBody = makeNestedContentField();
```

### Troubleshooting recursive fields

- When referencing a recursive field in `indexes` in my schema, I get `Type instantiation is excessively deep and possibly infinite`: You probably forgot to assign a manually crafted field schema type to the returned value of `replaceObjectFields`/`replaceArrayItems`/`replaceMapValues`.
