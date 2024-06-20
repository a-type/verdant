# @verdant-web/cli

## 4.4.1

### Patch Changes

- 274e047: Support supplying old schemas to client, and make CLI generate code to do this. This doesn't do anything yet!

## 4.4.0

### Minor Changes

- c701cfd: Add React hook "useOnChange" (fires a callback on entity changes). Add "deep" option to React hook "useWatch" to watch for deep changes. Remove the "field" variant of "useWatch." CLI must be updated to correctly generate new React hook types.

## 4.3.2

### Patch Changes

- 4daf1b0: CLI support for new react hooks options

## 4.3.1

### Patch Changes

- d5ca12f: Fix generated react hook mutations typings

## 4.3.0

### Minor Changes

- 4077465: This release officially removes support for "indexed" applied to individual fields in your schema. Please migrate to use the "indexes" section of the collection definition instead! It also fixes some typing issues with the new field creator functions on schema.fields.

## 4.2.4

### Patch Changes

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

## 4.2.3

### Patch Changes

- 14ec36f: Fix OS path resolution for commonJS check in CLI

## 4.2.2

### Patch Changes

- 398452d: Fix CLI for older node versions hanging on schema read

## 4.2.1

### Patch Changes

- f16fe63: Fix some typing issues in the CLI

## 4.2.0

### Minor Changes

- ba63e80: # Summary

  Major rewrite of internals for document storage to improve memory efficiency and data consistency. Introduces "pruning" and more advanced document validation.

  ## Breaking changes

  - Supplying invalid data to documents (according to the schema) is no longer ignored and throws an error.
  - Documents with data which doesn't conform to schema now "prune" invalid data up to the nearest nullable parent or array/map collection. If no prune point is found, the entire document is unavailable.
  - Removed `client.entities.flushPatches`; use `client.entities.flushAllBatches` instead to write all pending changes to storage and sync.

  ## Ambiguous changes

  - `changeDeep` event on documents now fires before `change`
  - Document entities will be garbage collected more reliably now. Storing references to entities outside of a query is not recommended. This behavior requires the `EXPERIMENTAL_weakRefs` flag to be provided to the client initializer.

## 4.2.0-next.0

### Minor Changes

- Major rewrite of internals for document storage to improve memory efficiency and data consistency. Introduces "pruning."

## 4.1.0

### Minor Changes

- 594a03c: Support limited options for string fields in schema and CLI. Adds validation for field values when writing to entities.

### Patch Changes

- 78d2fdf: Allow more non-interactive CLI selections
- fef825e: Fix CLI not bumping WIP schema to prod schema

## 4.0.5

### Patch Changes

- 6cab5a4: Server: delete empty snapshots and don't store new empty snapshots. This shouldn't have any effect on behavior. Client: fixed a rare bug with initializing a client for the first time. CLI: fixed typings for deletable fields.

## 4.0.4

### Patch Changes

- 4309702: Fix filter typings for array indexes

## 4.0.3

### Patch Changes

- 6b65690: Fix CLI upgrade writing to canonical schema

## 4.0.2

### Patch Changes

- 85e34fe: Fix another compound index problem with the CLI
- 1db7857: Fix CLI always wanting to upgrade

## 4.0.1

### Patch Changes

- be96681: Fix error with upgrading migrations from older CLI versions
- 465f400: Fix validation problem with compound indexes
- 15ad587: Fix generated migration typings

## 4.0.0

### Major Changes

- a73d381: Rewrites the CLI to fully evaluate schema code, rather than just parsing it as a Typescript AST.

  This allows schemas to import other modules and use any plain TS logic desired to define the final schema.

  Schemas are now bundled and compiled to JS before storing historical copies. The primary schema is now just a pointer to its historical version.

  Migrations now use the new `createMigration` function universally. Migrations are now generated with typings supplied by compiled historical schemas. This should make migration typings more consistent and reliable.

  This change also deprecates fields with `index: true` in favor of a new `indexes` part of a collection schema, which allows direct field pass-through indexes. This consolidates indexes in one place (or, two, with compounds...) and generally makes the typing simpler.

  Deleted a lot of extraneous TS typings.

  Store now only writes index values as top-level fields in the object written to IndexedDB. A snapshot of the object is still provided in a sub-key for future use. This should not be a noticeable change; Verdant had already phased out using the snapshot value in favor of regenerating the view from operations on first load of a document.

## 3.0.0

### Major Changes

- 81ca170: **Major CLI changes**:

  - The CLI now supports BETA WIP schema workflows. WIP schemas allow you to iterate on schema design locally more easily by copying your database into a temporary branch while you tune the new schema and automatically resetting it when the schema changes.
  - A new CLI command has been added: `verdant-preflight`. Include this in your CI to validate that the current schema is not WIP and ready for deployment before merging and deploying your app. Deploying a WIP schema can cause major problems for users, including data loss.
  - _Migration:_ CLI usage hasn't changed too much, but the workflow has. You'll see when you run it. It's more interactive now; no need to pass additional flags like `--force`.

  Store changes:

  - Store now supports WIP schemas. Supplying a schema with `wip: true` to the StoreDescriptor will initialize a Store with the WIP schema and copy all data from the main databases into temporary fork databases for that schema. You can then test your app with the schema changes before committing to a particular schema shape.
  - WIP schema usage disables sync! This prevents ephemeral data from being stored on the server or passed to other clients. Commit your WIP schema changes into a production schema to re-enable sync.

## 2.2.1

### Patch Changes

- df7577f: fix one more snapshot typing error

## 2.2.0

### Minor Changes

- a3cd86c: Add unsuspended React hook variants

### Patch Changes

- f36369e: Fix entity snapshot typings

## 2.1.2

### Patch Changes

- a989af4: Query.subscribe now supports specifying event to subscribe to. Former use is deprecated but still available. React paginated query hooks now supply a status parameter to check query re-validation.

## 2.1.1

### Patch Changes

- 0a8f0f2: Add typings for client events

## 2.1.0

### Minor Changes

- a8c8c09: New migration features: shortcut migrations, auto-migration

  ## Shortcut migrations

  You can skip versions when creating migrations, effectively deprecating ranges of versions which you believe no existing clients utilize anymore. This should be done with care!

  You can also use shortcut migrations to create a parallel path from one version to another which skips intermediate versions, reducing the number of migrations new clients have to make to reach the current version.

  See the [docs](https://verdant.dev/docs/local-storage/migrations) for more!

  ## Auto-migration

  Schema migrations now automatically apply simple changes without you having to write any migration logic. Changes supported are:

  - Adding indexes
  - Changing indexes
  - Removing indexes
  - Adding default values to fields or sub-fields
  - Removing fields or sub-fields

  If your schema changes fall within these categories, you don't have to write any migration logic! Just leave the generated file in-place.

## 2.0.3

### Patch Changes

- b044e75: Fix bug with presence hook, typing on mutation hooks

## 2.0.2

### Patch Changes

- 95ee4e8: Fix string[] indexes not having a startsWith filter type

## 2.0.1

### Patch Changes

- db43f41: Rename framework to "Verdant"

## 2.0.0

### Major Changes

- 9219d68: New queries, including paginated queries.

  # Breaking changes & migration

  You must move any index filters passed to `findOne` or `findAll` into an `index` property in the passed object parameter.

  # What's changed under the hood

  The query system has been revamped to allow for pagination, more intentional caching, and lazy-loading results.

  For the most part, existing `get`, `findOne`, and `findAll` queries work the same as before. However, note that they will not longer eagerly fetch results on creation; you must access `.resolved` or call `.subscribe` to trigger the initial query.

  # New features

  There are two new queries, `getAllInfinite` and `getPage`, which load paginated subsets of the results. You can read about how to use these new queries in the docs.

  This is a major version change for `web` because of the `index` field change, and lazy-loading may cause unforeseen issues in existing codebases. Please upgrade and test functionality carefully. `cli` has also been major-bumped to go along with `web` since it now generates code that relies on `web`'s new functionality.

## 1.13.2

### Patch Changes

- d88ab64: Specify TS as schema parse language

## 1.13.1

### Patch Changes

- f8c39b3: Add shebang to CLI script

## 1.13.0

### Minor Changes

- c02e4ce: Allow adding custom mutation hooks to createHooks

## 1.12.1

### Patch Changes

- 689b803: Export primitive field types

## 1.12.0

### Minor Changes

- 0c5dc4c: Big update to increase consistency of sync and patch up some faulty assumptions in the protocol. NOTE: clients may re-sync the whole library upon connection after upgrade, but this should only happen once.

## 1.11.2

### Patch Changes

- bc7b6ad: Several fixes for file behaviors

## 1.11.1

### Patch Changes

- 8f61139: Fix filter typings

## 1.11.0

### Minor Changes

- 6aae4d6: Support for file fields, file uploads and storage

## 1.10.2

### Patch Changes

- b879919: Update and fix some react usages
- b879919: Add commonjs module option

## 1.10.1

### Patch Changes

- d36ae73: Expose **dangerous**resetLocal to users

## 1.10.0

### Minor Changes

- 5587bbf: Fix hook typings to correctly suggest that any query result may be null

## 1.9.5

### Patch Changes

- f4917a4: Fix major bug with desc.open(), rollback WeakRef usage
- ea9928c: Fix map typings generation

## 1.9.4

### Patch Changes

- 3603f95: Fix hook typings when no index provided

## 1.9.3

### Patch Changes

- 15ed2a2: Skippable hooks, new advanced hooks, configurable sync

## 1.9.2

### Patch Changes

- d5c8187: Hook for querying peers

## 1.9.1

### Patch Changes

- 28fdcbb: fix bug in codegen with only compound indexes

## 1.9.0

### Minor Changes

- 8c95fbc: Expose method to reset server-side data for a library

## 1.8.0

### Minor Changes

- 49d7f88: Advanced batching and undo control. Bugfixes for undo application.

## 1.7.4

### Patch Changes

- 17ce9dc: fix useWatch on specific property

## 1.7.3

### Patch Changes

- a7113ed: fix useWatch typings

## 1.7.2

### Patch Changes

- b03fa61: Refactor for sync stability

## 1.7.1

### Patch Changes

- 91f4c5f: Add declarative sync control in React

## 1.7.0

### Minor Changes

- 99358b7: Remove loadInitialData

## 1.6.0

### Minor Changes

- 7eeee9e: Rework entity typings and codegen

## 1.5.1

### Patch Changes

- 70b9a88: Fix useWatch, allow null ID in usePeer

## 1.5.0

### Minor Changes

- 54ec520: Variable typing of Presence and Profile. Continuing to reduce typing complexity internally in the library.

## 1.4.2

### Patch Changes

- 9321cb0: Expose undo hooks

## 1.4.1

### Patch Changes

- 895fda4: Add startsWith filter for string fields

## 1.4.0

### Minor Changes

- f0fad90: Include migrations and schema history in CLI

## 1.3.0

### Minor Changes

- 8369c49: Add deep change subscription. Lots of consistency fixes. More performant diffing of nested updates. Overhaul OID internal storage mechanism. Presence update batching.

## 1.2.0

### Minor Changes

- 0e11d9b: Big internal refactoring to improve performance and consistency. Major bugfixes to undo, sync exchanges.

## 1.1.6

### Patch Changes

- d7f2561: hotfix: don't delete indexed fields, only synthetics

## 1.1.5

### Patch Changes

- 617a84c: Add integration tests for migration and fix several bugs

## 1.1.4

### Patch Changes

- b0764a2: fix map sub-object typing

## 1.1.3

### Patch Changes

- 18e45b1: add sub-object typings to cli

## 1.1.2

### Patch Changes

- c9b8238: fix never filter file concatenation

## 1.1.1

### Patch Changes

- c013141: more lenient schema support in cli

## 1.1.0

### Minor Changes

- dcd5dd9: Use a provider to supply storage client for react hooks

## 1.0.1

### Patch Changes

- f8080ea: expose and generate types for delete all

## 1.0.0

### Minor Changes

- 7c87fdd: Undo and redo, more aggressive rebasing

## 0.2.0

### Minor Changes

- 5c4a92d: Separate auth into its own endpoint

## 0.1.4

### Patch Changes

- 7a333aa: default field values
- 0497ebe: make schema indexes optional

## 0.1.3

### Patch Changes

- fa2e4a8: bugfixes

## 0.1.2

### Patch Changes

- fcf50cb: fix another typing bug

## 0.1.1

### Patch Changes

- 6c12397: fix several more cli bugs
- c7e541f: plural client collection names, fix generator bugs

## 0.1.0

### Patch Changes

- 3f71be4: Added CLI to generate client typings
