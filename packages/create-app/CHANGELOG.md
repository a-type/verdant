# @verdant-web/create-app

## 0.5.0

### Minor Changes

- 8b004bd: _New!_ Schema helpers to replace old type-restricted schema objects. Utilize the helpers to get better intellisense and more helpful TS validation in your schema.

  ```ts
  import { schema } from '@verdant-web/store';

  const items = schema.collection({
  	name: 'item',
  	primaryKey: 'id',
  	fields: {
  		id: schema.fields.string({ default: schema.generated.id }),
  		obj: schema.object({
  			properties: {
  				name: schema.fields.string(),
  				value: schema.fields.number(),
  			},
  			default: {
  				name: 'hello',
  				value: 1,
  			},
  		}),
  	},
  });

  export default schema({
  	version: 1,
  	collections: {
  		items,
  	},
  });
  ```

  They may be a little more verbose, but using these wrappers is essential to adding better type validation and other potential features down the line (like typed `any` fields).

  Also, `object` field now accepts default. Object defaults recursively apply nested field defaults if present.

## 0.4.2

### Patch Changes

- 19cbf93: Specify module for code generation during bootstrap of create-app

## 0.4.1

### Patch Changes

- e461f9a: Fix some issues with local-only bootstrapper

## 0.4.0

### Minor Changes

- 1ab69ee: Add a "Grant's version" template to create-app bootstrapper

## 0.3.1

### Patch Changes

- ba63e80: # Summary

  Major rewrite of internals for document storage to improve memory efficiency and data consistency. Introduces "pruning" and more advanced document validation.

  ## Breaking changes

  - Supplying invalid data to documents (according to the schema) is no longer ignored and throws an error.
  - Documents with data which doesn't conform to schema now "prune" invalid data up to the nearest nullable parent or array/map collection. If no prune point is found, the entire document is unavailable.
  - Removed `client.entities.flushPatches`; use `client.entities.flushAllBatches` instead to write all pending changes to storage and sync.

  ## Ambiguous changes

  - `changeDeep` event on documents now fires before `change`
  - Document entities will be garbage collected more reliably now. Storing references to entities outside of a query is not recommended. This behavior requires the `EXPERIMENTAL_weakRefs` flag to be provided to the client initializer.

## 0.3.1-next.0

### Patch Changes

- Major rewrite of internals for document storage to improve memory efficiency and data consistency. Introduces "pruning."

## 0.3.0

### Minor Changes

- fc2b3f8: Add preflight to app build step

### Patch Changes

- 725d80f: Add gitignore to create app

## 0.2.0

### Minor Changes

- 2853187: Update Verdant packages before running starter kit

## 0.1.2

### Patch Changes

- ed6dcdd: Fix lo-fi references

## 0.1.1

### Patch Changes

- a2cf3a1: Fix lo-fi references
