# @verdant-web/common

## 2.0.0

### Major Changes

- ba63e80: # Summary

  Major rewrite of internals for document storage to improve memory efficiency and data consistency. Introduces "pruning" and more advanced document validation.

  ## Breaking changes

  - Supplying invalid data to documents (according to the schema) is no longer ignored and throws an error.
  - Documents with data which doesn't conform to schema now "prune" invalid data up to the nearest nullable parent or array/map collection. If no prune point is found, the entire document is unavailable.
  - Removed `client.entities.flushPatches`; use `client.entities.flushAllBatches` instead to write all pending changes to storage and sync.

  ## Ambiguous changes

  - `changeDeep` event on documents now fires before `change`
  - Document entities will be garbage collected more reliably now. Storing references to entities outside of a query is not recommended. This behavior requires the `EXPERIMENTAL_weakRefs` flag to be provided to the client initializer.

## 2.0.0-next.0

### Major Changes

- Major rewrite of internals for document storage to improve memory efficiency and data consistency. Introduces "pruning."

## 1.16.2

### Patch Changes

- 5a5a312: Fix multiple bugs handling nested files in entities

## 1.16.1

### Patch Changes

- 56cee57: Fix computing compound indexes from other indexes

## 1.16.0

### Minor Changes

- 594a03c: Support limited options for string fields in schema and CLI. Adds validation for field values when writing to entities.

### Patch Changes

- e96b252: Collections deleted during migrations now properly delete all related data

## 1.15.5

### Patch Changes

- c686e0f: Another legacy OID hotfix. These things are pesky! Good thing you didn't use this library before May 2023 like I did.

## 1.15.4

### Patch Changes

- 7b3e213: Another legacy OID fix

## 1.15.3

### Patch Changes

- b0c78bf: ⚠️⚠️ This version requires updating the client and server simultaneously if your app still has legacy OIDs applied to documents. Hopefully that just means me. Does anyone else use Verdant? Anyway, this one removes those legacy OIDs completely so I don't have to worry about them anymore.

  Sorry for not really being semver-conscious here, but I really doubt it affects anyone at this point. You'd have to have been using Verdant before May 26, 2023 for this to matter to you.

## 1.15.3-next.0

### Patch Changes

- b0c78bf2: ⚠️⚠️ This version requires updating the client and server simultaneously if your app still has legacy OIDs applied to documents. Hopefully that just means me. Does anyone else use Verdant? Anyway, this one removes those legacy OIDs completely so I don't have to worry about them anymore.

  Sorry for not really being semver-conscious here, but I really doubt it affects anyone at this point. You'd have to have been using Verdant before May 26, 2023 for this to matter to you.

## 1.15.2

### Patch Changes

- 633bb00: Another legacy document hotfix

## 1.15.1

### Patch Changes

- f847ec1: Hotfix for old apps using legacy "." formatted OIDs (I gotta migrate those...)

## 1.15.0

### Minor Changes

- a73d381: Rewrites the CLI to fully evaluate schema code, rather than just parsing it as a Typescript AST.

  This allows schemas to import other modules and use any plain TS logic desired to define the final schema.

  Schemas are now bundled and compiled to JS before storing historical copies. The primary schema is now just a pointer to its historical version.

  Migrations now use the new `createMigration` function universally. Migrations are now generated with typings supplied by compiled historical schemas. This should make migration typings more consistent and reliable.

  This change also deprecates fields with `index: true` in favor of a new `indexes` part of a collection schema, which allows direct field pass-through indexes. This consolidates indexes in one place (or, two, with compounds...) and generally makes the typing simpler.

  Deleted a lot of extraneous TS typings.

  Store now only writes index values as top-level fields in the object written to IndexedDB. A snapshot of the object is still provided in a sub-key for future use. This should not be a noticeable change; Verdant had already phased out using the snapshot value in favor of regenerating the view from operations on first load of a document.

## 1.14.1

### Patch Changes

- 81ca170: **Major CLI changes**:

  - The CLI now supports BETA WIP schema workflows. WIP schemas allow you to iterate on schema design locally more easily by copying your database into a temporary branch while you tune the new schema and automatically resetting it when the schema changes.
  - A new CLI command has been added: `verdant-preflight`. Include this in your CI to validate that the current schema is not WIP and ready for deployment before merging and deploying your app. Deploying a WIP schema can cause major problems for users, including data loss.
  - _Migration:_ CLI usage hasn't changed too much, but the workflow has. You'll see when you run it. It's more interactive now; no need to pass additional flags like `--force`.

  Store changes:

  - Store now supports WIP schemas. Supplying a schema with `wip: true` to the StoreDescriptor will initialize a Store with the WIP schema and copy all data from the main databases into temporary fork databases for that schema. You can then test your app with the schema changes before committing to a particular schema shape.
  - WIP schema usage disables sync! This prevents ephemeral data from being stored on the server or passed to other clients. Commit your WIP schema changes into a production schema to re-enable sync.

## 1.14.0

### Minor Changes

- e2fe2aa: Bugfix: fix file refs breaking document snapshots

## 1.13.4

### Patch Changes

- fd55c1b: Fix another bug with legacy OIDs

## 1.13.3

### Patch Changes

- 1429bfb: Verdant's client no longer applies changes from _future versions of your schema_ to local data. These changes are still stored and synced, but they will not be reflected in the application. This change is necessary to ensure data integrity with the code that's actually running on your device-- if a future schema changes the shape of the data, but the current client doesn't have that change yet, any data that reflects those changes could be reshaped and violate the expected types in the older code.

  This is technically a breaking change but I would hope nobody is relying on that behavior for some reason.

  I've added an event you can subscribe to on the client called `futureSeen`. If the client notices a change from a future version of the app, it will fire this event. You can subscribe to it to prompt the user to reload the page and get the latest code. Otherwise, in a realtime scenario, they simply won't see the changes the other client is making.

## 1.13.2

### Patch Changes

- 9f2d7f2: bugfix: migrating new collections

## 1.13.1

### Patch Changes

- 6075f8d: Bugfix: don't automigrate v1
- 8d32085: Provide more information for some errors
- 509917c: Major bugfix for legacy object identifier compatibility
- 9edb078: Experimental "downloadRemote" property for file fields, which tries to download and store the file locally for offline use if it's not already on the device.

## 1.13.0

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

## 1.12.0

### Minor Changes

- c243009: (internal) remove extranous data from object IDs

## 1.11.1

### Patch Changes

- db43f41: Rename framework to "Verdant"

## 1.11.0

### Minor Changes

- 9219d68: New queries, including paginated queries.

  # Breaking changes & migration

  You must move any index filters passed to `findOne` or `findAll` into an `index` property in the passed object parameter.

  # What's changed under the hood

  The query system has been revamped to allow for pagination, more intentional caching, and lazy-loading results.

  For the most part, existing `get`, `findOne`, and `findAll` queries work the same as before. However, note that they will not longer eagerly fetch results on creation; you must access `.resolved` or call `.subscribe` to trigger the initial query.

  # New features

  There are two new queries, `getAllInfinite` and `getPage`, which load paginated subsets of the results. You can read about how to use these new queries in the docs.

  This is a major version change for `web` because of the `index` field change, and lazy-loading may cause unforeseen issues in existing codebases. Please upgrade and test functionality carefully. `cli` has also been major-bumped to go along with `web` since it now generates code that relies on `web`'s new functionality.

## 1.10.4

### Patch Changes

- d0e546d: Fix your own replica's presence showing up as a peer on a different device

## 1.10.3

### Patch Changes

- bf566ef: Fix big inefficiencies in synced baselines, overhaul highwater/ack system

## 1.10.2

### Patch Changes

- 4af8cc0: Fix bug in server snapshot which was returning undefined for non-rebased docs

## 1.10.1

### Patch Changes

- 4548567: Add an 'updatedAt' timestamp to Entity which reflects the wall time of the last applied operation

## 1.10.0

### Minor Changes

- 0c5dc4c: Big update to increase consistency of sync and patch up some faulty assumptions in the protocol. NOTE: clients may re-sync the whole library upon connection after upgrade, but this should only happen once.

## 1.9.0

### Minor Changes

- 6aae4d6: Support for file fields, file uploads and storage
- 55ffd63: Fix array synthetics index

## 1.8.4

### Patch Changes

- 01936cf: Fix a bug in undo list delete

## 1.8.3

### Patch Changes

- b879919: Update and fix some react usages

## 1.8.2

### Patch Changes

- 023abf8: Server API for document snapshots

## 1.8.1

### Patch Changes

- 1bc2b2d: Fix import

## 1.8.0

### Minor Changes

- 0c93e2e: Update replica metadata to key on library ID so a replica which connects to different libraries does not wind up with incorrect metadata

## 1.7.1

### Patch Changes

- aa40deb: Fix bug in merge behavior for update

## 1.7.0

### Minor Changes

- 272e859: Fix a big bug in .update on entities erasing properties

### Patch Changes

- 28fdcbb: fix bug in codegen with only compound indexes

## 1.6.0

### Minor Changes

- 8c95fbc: Expose method to reset server-side data for a library

## 1.5.0

### Minor Changes

- 49d7f88: Advanced batching and undo control. Bugfixes for undo application.

## 1.4.5

### Patch Changes

- b1a4646: Handle special characters in document IDs
- 4a9a9c8: Add sources to npm files

## 1.4.4

### Patch Changes

- fab4656: New more compact timestamp format

## 1.4.3

### Patch Changes

- b03fa61: Refactor for sync stability

## 1.4.2

### Patch Changes

- f13043f: No longer crash on list operations for non lists, just ignore them and log a warning

## 1.4.1

### Patch Changes

- 1486b2f: More advanced watch tools for changes

## 1.4.0

### Minor Changes

- 0562878: Overhaul migrations to include arbitrary mutations and querying

## 1.3.3

### Patch Changes

- 5ff038a: add sanitize index value function

## 1.3.2

### Patch Changes

- b2fe1f9: fix defaulting behavior

## 1.3.1

### Patch Changes

- 895fda4: Add startsWith filter for string fields

## 1.3.0

### Minor Changes

- 8369c49: Add deep change subscription. Lots of consistency fixes. More performant diffing of nested updates. Overhaul OID internal storage mechanism. Presence update batching.

## 1.2.0

### Minor Changes

- 0e11d9b: Big internal refactoring to improve performance and consistency. Major bugfixes to undo, sync exchanges.

## 1.1.4

### Patch Changes

- 0e7299e: Remove unique field option. Add default values during default migrations.

## 1.1.3

### Patch Changes

- d7f2561: hotfix: don't delete indexed fields, only synthetics

## 1.1.2

### Patch Changes

- 617a84c: Add integration tests for migration and fix several bugs

## 1.1.1

### Patch Changes

- 03b40f3: Add sort filter, fix bugs with diff and filters

## 1.1.0

### Minor Changes

- f3bd34f: use more descriptive oids

## 1.0.3

### Patch Changes

- 2560a63: Add passive and read-only replica types

## 1.0.2

### Patch Changes

- d29193f: include map in nestable field types

## 1.0.1

### Patch Changes

- 5f89e31: fix delete not affecting sub-object

## 1.0.0

### Minor Changes

- 7c87fdd: Undo and redo, more aggressive rebasing

## 0.3.0

### Minor Changes

- 5c4a92d: Separate auth into its own endpoint

## 0.2.1

### Patch Changes

- 7a333aa: default field values
- 0497ebe: make schema indexes optional

## 0.2.0

### Minor Changes

- dd0e3a8: Hybrid push/pull sync for solo clients

## 0.1.1

### Patch Changes

- 3f71be4: Added CLI to generate client typings

## 0.1.0

### Patch Changes

- 19bc8f2: Added 'any' field type to schema
- 3d2e2e5: support plural name in hooks
