# @lo-fi/web

## 4.6.1

### Patch Changes

- 6d79912: Refine some server reset sync logic

## 4.6.0

### Minor Changes

- 6cfa90d: Complete refactor of server to support more runtimes. This fundamentally changes how Verdant server is constructed and used in Node, and adds a Cloudflare binding.

  ## Breaking changes

  - New, rewritten Node bindings and initialization procedure. See docs.
  - **Removed:** Unified SQL storage. Only sharded SQLite storage is supported.
  - How Node sync servers interact with libraries has changed. See docs.

  ## Internal changes

  These shouldn't affect user code but do require updating client/server in tandem.

  - Heartbeat payload is simplified to just `type`.

  ## New: Cloudflare

  Verdant now has experimental support for Cloudflare stacks, using Durable Objects to represent individual Verdant libraries.

  This always seemed like a good fit, but the effort of refactoring required to adapt to a very different backend architecture meant it's been a long time coming.

  Cloudflare bindings pass the same extensive integration test suite as the original Node bindings, 1:1. This gives some real confidence in stability, but for the time being they remain `0.1` until proven in production.

  ## Other things

  The main integration test suite has been rewritten from JSDOM and now uses Vitest Browser Mode, to provide even more reliability that Verdant works in real browsers. The tests are also faster now!

### Patch Changes

- Updated dependencies [6cfa90d]
  - @verdant-web/common@3.0.0

## 4.5.2

### Patch Changes

- d59c730: Add timing debug output to queries

## 4.5.1

### Patch Changes

- 6479573: More resilience around incorrect data types and refs

## 4.5.0

### Minor Changes

- fb75036: Deleting documents no longer fires change events to avoid processing changes on deleted (empty) data, which application logic is probably not designed for. This should also hopefully fix the redundant initial change events that were fired on newly created entities.

## 4.4.2

### Patch Changes

- 36ac749: Add built-in logger and logger options

## 4.4.1

### Patch Changes

- 31ea7e5: Store: improve error behavior for failed sync. TipTap: fix editor not refreshing when source entities change.

## 4.4.0

### Minor Changes

- f0254d4: Store: overhaul "pruning" self-healing data systems to produce reliably valid data and fix bugs. Eliminate a few memory leaks. Common: add a few new util functions.

### Patch Changes

- Updated dependencies [f0254d4]
  - @verdant-web/common@2.9.1

## 4.3.0

### Minor Changes

- f2193b5: Lots of bug fixes for diffing lists, manipulating pruned (invalid) data, and reducing patch sizes for moving items in lists and other diffs.

### Patch Changes

- Updated dependencies [f2193b5]
  - @verdant-web/common@2.9.0

## 4.2.0

### Minor Changes

- c793e54: Major but non-breaking changes to the diffing algorithm. Some undefined behaviors may be different when using `.update`, or during collection migrations. But all of those behaviors were bad or confusing before, and now they make a little more sense.

  # Store changes

  You can now use the `getEntityClient` exported function to retrieve the Client instance which owns any Verdant entity. I don't necessarily recommend using this much, but you might find it convenient as an alternative to `useClient`.

  # TipTap changes

  This version also fixes the TipTap integration's Undo behavior when deleting nodes, which previously caused invalid data. It changes the approach of the library by exposing a TipTap Extension for Verdant integration instead of relying on React.

  This integration also now allows you to switch between TipTap or Verdant's undo tracking as you see fit.

  See [docs](https://verdant.dev/docs/integrations/tiptap)

### Patch Changes

- Updated dependencies [c793e54]
  - @verdant-web/common@2.8.0

## 4.1.6

### Patch Changes

- Updated dependencies [005cf3d]
  - @verdant-web/common@2.7.3

## 4.1.5

### Patch Changes

- 8466924: [React] useWatch and useOnChange are now exported bare from the library, allowing use without calling createHooks(). [Store/Common] Field defaults for array and map fields are now partially supported. Typescript does not like them.
- Updated dependencies [8466924]
  - @verdant-web/common@2.7.2

## 4.1.4

### Patch Changes

- Updated dependencies [9e863cc]
  - @verdant-web/common@2.7.1

## 4.1.3

### Patch Changes

- 4312c3f: Server: fixed bug with demo server loading files with spaces in filenames. Store: Fixed a bug which caused files not immediately uploaded to end up on the server with a filename "blob" instead of the original filename.
- ef5fa50: New Store feature: query keep-alives. Keep a query in memory based on its `key`. Also new in CLI, the Client is now generated with more JSDocs applied, and exposes the .queries property required to use the keep-alive feature.

## 4.1.2

### Patch Changes

- 8db2e33: Remove unused dependencies
- be750c7: Make document index saving a little more failure tolerant to prevent full app lock-outs due to single document corruption

## 4.1.1

### Patch Changes

- be58ddf: Add 'main' field to store package

## 4.1.0

### Minor Changes

- b5d15631: Beginning of support for alternative persistence implementations. This involves major internal refactoring and some undocumented internal-use-only library API changes.

### Patch Changes

- 9fbf4166: Try a different approach
- e3d304a8: Manually invoke abort controller
- 21357127: fix cli old schemas index generation. fix WIP crash.
- 16243363: This is ridiculous!
- 87aa284a: Ignore illegal invocation error from abort controller
- 867d4cb6: Just stop aborting the thing I guess
- ddc1a25b: dont throw on blocked upgrade
- e319c589: Add extra check
- e0a6a919: Sometimes you think you know javascript, but
- Updated dependencies [b5d15631]
  - @verdant-web/common@2.7.0

## 4.1.0-alpha.9

### Patch Changes

- ddc1a25b: dont throw on blocked upgrade

## 4.1.0-alpha.8

### Patch Changes

- 867d4cb6: Just stop aborting the thing I guess

## 4.1.0-alpha.7

### Patch Changes

- e0a6a919: Sometimes you think you know javascript, but

## 4.1.0-alpha.6

### Patch Changes

- 16243363: This is ridiculous!

## 4.1.0-alpha.5

### Patch Changes

- 9fbf4166: Try a different approach

## 4.1.0-alpha.4

### Patch Changes

- e3d304a8: Manually invoke abort controller

## 4.1.0-alpha.3

### Patch Changes

- e319c589: Add extra check

## 4.1.0-alpha.2

### Patch Changes

- 87aa284a: Ignore illegal invocation error from abort controller

## 4.1.0-alpha.1

### Patch Changes

- 21357127: fix cli old schemas index generation. fix WIP crash.

## 4.1.0-alpha.0

### Minor Changes

- b5d15631: Beginning of support for alternative persistence implementations. This involves major internal refactoring and some undocumented internal-use-only library API changes.

### Patch Changes

- Updated dependencies [b5d15631]
  - @verdant-web/common@2.7.0-alpha.0

## 4.0.0

### Major Changes

- 423493cf: Major internal refactoring of persistence layer. Verdant still only supports IndexedDB for now, but this is a huge step toward configurable storage. Prereleasing this version to test in real-world environments.
- 1787ef97: Official release of refactored persistence layer! This doesn't have much functional impact for users, but some advanced/experimental config settings have changed. Store now requires a recently generated client via CLI; be sure to upgrade CLI and regenerate your client from your schema even if your schema hasn't changed.

### Patch Changes

- 5576e5ee: Fix file downloads failing when sync isn't immediately started on launch
- Updated dependencies [423493cf]
- Updated dependencies [1787ef97]
- Updated dependencies [5576e5ee]
  - @verdant-web/common@2.6.0

## 4.0.0-next.1

### Patch Changes

- 5576e5ee: Fix file downloads failing when sync isn't immediately started on launch
- Updated dependencies [5576e5ee]
  - @verdant-web/common@2.6.0-next.1

## 4.0.0-next.0

### Major Changes

- 423493cf: Major internal refactoring of persistence layer. Verdant still only supports IndexedDB for now, but this is a huge step toward configurable storage. Prereleasing this version to test in real-world environments.

### Patch Changes

- Updated dependencies [423493cf]
  - @verdant-web/common@2.6.0-next.0

## 3.12.1

### Patch Changes

- 66041118: Make getAll() result readonly

## 3.12.0

### Minor Changes

- 78503b2a: Importing now supports old schema versions. Also fixed a bug when resetting an outdated or new client to a dataset which comes from an outdated schema.

## 3.11.1

### Patch Changes

- 7a04f786: Experimental support for periodic background sync
- Updated dependencies [729a908e]
  - @verdant-web/common@2.5.2

## 3.11.0

### Minor Changes

- 31f59a77: ## Store

  Adds built-in presence features for field presence. Use `setFieldId` to track presence on a field. If using directly, you must decide on a field ID for the field. See React docs for more seamless integration with `useField`.

  ## React

  Adds the `useField` hook. Pass an entity and a key and it gives you a grab bag of all the stuff you need to work with a particular field. See docs for more info.

  ## Common

  Adds the 'id' field type as a shorthand for string type with an id generated default

### Patch Changes

- Updated dependencies [31f59a77]
  - @verdant-web/common@2.5.1

## 3.10.0

### Minor Changes

- fe020adb: Add "internal" presence concepts which use presence machinery to power built-in features. Starting with "view ID" which encodes the 'view' the user is looking at, further refining presence peer relationships for apps with multiple distinct views. This version also adds a cleanup callback to the router's route onVisited callback.

### Patch Changes

- Updated dependencies [fe020adb]
  - @verdant-web/common@2.5.0

## 3.9.0

### Minor Changes

- 4679a9fb: Authorized document access full release
- 5882e6dc: Introduces document access control. It's now possible to mark specific documents as 'private,' which restricts access of these documents to only the current user's devices in sync scenarios. Access controls have no effect on local-only databases, but are still advised for use since these libraries might sync someday in the future. See the docs for information on how to assign access control and caveats about usage.

### Patch Changes

- d075461f: Ensure level supplied to all logs
- 176c32e5: Add typing to user log fn config
- Updated dependencies [91ab8cd7]
- Updated dependencies [4679a9fb]
- Updated dependencies [5882e6dc]
  - @verdant-web/common@2.4.0

## 3.9.0-next.2

### Patch Changes

- d075461f: Ensure level supplied to all logs

## 3.9.0-next.1

### Patch Changes

- Updated dependencies [91ab8cd7]
  - @verdant-web/common@2.4.0-next.1

## 3.9.0-next.0

### Minor Changes

- 5882e6dc: Introduces document access control. It's now possible to mark specific documents as 'private,' which restricts access of these documents to only the current user's devices in sync scenarios. Access controls have no effect on local-only databases, but are still advised for use since these libraries might sync someday in the future. See the docs for information on how to assign access control and caveats about usage.

### Patch Changes

- Updated dependencies [5882e6dc]
  - @verdant-web/common@2.4.0-next.0

## 3.8.4

### Patch Changes

- d0c8fd5e: Fix a bug which made replicas which have been offline for a long time fail to sync back up

## 3.8.3

### Patch Changes

- dbb5925: Add types for subscribeToField

## 3.8.2

### Patch Changes

- d11e3ab: Subscribe to individual fields on entities

## 3.8.1

### Patch Changes

- 274e047: Support supplying old schemas to client, and make CLI generate code to do this. This doesn't do anything yet!
- d876471: Throttle presence updates over http sync to reduce http requests
- Updated dependencies [d876471]
  - @verdant-web/common@2.3.4

## 3.8.0

### Minor Changes

- c9a0183: Putting a new document now ignores keys not included in the schema. Putting a new document also now properly validates incoming data against the schema and errors on data of the wrong type.

### Patch Changes

- Updated dependencies [c9a0183]
  - @verdant-web/common@2.3.3

## 3.7.0

### Minor Changes

- c2a3c78: Fixed some big performance gaps in React hooks - query hooks no longer refresh queries on each render! Also dramatically reduced the number of times a query emits 'change' events to match only changes in the identities of returned documents, as designed, by fixing a mistake in change notification logic. Combined, these drastically improve performance in apps with frequent or real-time changes!
- 91a6a64: Add operation "overlaying," which compresses multiple batched changes to the same field into a single operation before persisting to storage and sync. This preserves the instantaneous nature of immediate changes, while also improving storage and network efficiency by not flushing every instantaneous operation to sync.

### Patch Changes

- e202bdd: Don't add set operations if the value hasn't changed. Add ListEntity.reduce.
- Updated dependencies [91a6a64]
  - @verdant-web/common@2.3.2

## 3.6.4

### Patch Changes

- 73e8c1b: Add entity features to enable multi-namespace use cases: access to parent namespace value, and self-delete method.

## 3.6.3

### Patch Changes

- c701cfd: Add React hook "useOnChange" (fires a callback on entity changes). Add "deep" option to React hook "useWatch" to watch for deep changes. Remove the "field" variant of "useWatch." CLI must be updated to correctly generate new React hook types.

## 3.6.2

### Patch Changes

- 5e4dfd7: Fix 'already transferred' check

## 3.6.1

### Patch Changes

- d346234: Origin transfer tools (experimental!)

## 3.6.0

### Minor Changes

- 848c1c2: Expose a "syncOnce" method for periodic background sync usage. This can be used to perform one "sync up" cycle without initiating a regular interval.

### Patch Changes

- 1ab35f2: Make broadcast channel namespace-specific
- Updated dependencies [1ab35f2]
  - @verdant-web/common@2.3.1

## 3.5.2

### Patch Changes

- 39cd3a0: Expose an id generator
- f4bfccc: Expose UndoHistory from library

## 3.5.1

### Patch Changes

- 938cfb2: Allow explicit undefined values in Entity.update. Ignore them by default.

## 3.5.0

### Minor Changes

- e7598d2: Bugfix: map-type entities were returning raw default values for missing keys
  Feature: `getOrSet` on entities allows providing an inline default to initialize an empty field synchronously

## 3.4.0

### Minor Changes

- 43edd7a: **Migration of server code required**

  Introduces support for custom server storage solutions via interface implementation. This change also makes server storage queries and writes async (they weren't before), which improves compatibility with custom solutions and performance overall with high message concurrency.

  ## Server migration

  Previously, you'd create a new Verdant server like so:

  ```ts
  new VerdantServer({
  	databaseFile: './path/to/db.sqlite',
  });
  ```

  Now, you should import `sqlStorage` from `@verdant-web/server/storage` and provide it to the `storage` parameter:

  ```ts
  new VerdantServer({
  	storage: sqlStorage({
  		databaseFile: './path/to/db.sqlite',
  	}),
  });
  ```

  That's all that's needed. Remember to also upgrade your client to handle some small tweaks to sync protocols. They should be non-breaking, but it's better to be safe here.

### Patch Changes

- Updated dependencies [43edd7a]
  - @verdant-web/common@2.3.0

## 3.4.0-next.0

### Minor Changes

- 43edd7a: Introduces support for custom server storage solutions via interface implementation. This change also makes server storage queries and writes async (they weren't before), which improves compatibility with custom solutions and performance overall with high message concurrency.

### Patch Changes

- Updated dependencies [43edd7a]
  - @verdant-web/common@2.3.0-next.0

## 3.3.2

### Patch Changes

- 5303b94: Tweak transactions to improve client query performance

## 3.3.1

### Patch Changes

- ecc696c: Fix broken fetch default binding

## 3.3.0

### Minor Changes

- 5fef280: # Support for full export/import of client data

  `Client.export` now returns an object with the full operation history, and now also data for all files and the downloaded files themselves.

  This can be used to create a backup ZIP file with the new `@verdant-web/store/backup` export. This is exported separately so that applications which don't need this functionality can reduce bundle size, as it comes with a full ZIP implementation.

  `Client.import` accepts the exact data that `Client.export` produces, allowing you to transfer data from one client to another. As a convenience for resolving disasters, `Client.__dangerous__hardReset` has been added, which exports and imports in-place, completely rewriting all local data. This may resolve issues in the wild with local database corruption should that happen again (God forbid).

### Patch Changes

- 6b7b123: Fix sync typings

## 3.2.2

### Patch Changes

- bee37cd: Support custom fetch implementation in sync

## 3.2.1

### Patch Changes

- 064a094: Fix failure to save document query indexes when data was synced which includes collections which are no longer in the current schema

## 3.2.0

### Minor Changes

- 4077465: This release officially removes support for "indexed" applied to individual fields in your schema. Please migrate to use the "indexes" section of the collection definition instead! It also fixes some typing issues with the new field creator functions on schema.fields.

### Patch Changes

- Updated dependencies [4077465]
  - @verdant-web/common@2.2.0

## 3.1.2

### Patch Changes

- 3bd652f: Support fetch-style server integration using new server methods.

## 3.1.1

### Patch Changes

- e4f0720: Fix bug with presence not having a local replica id
- Updated dependencies [e4f0720]
  - @verdant-web/common@2.1.1

## 3.1.0

### Minor Changes

- e0b2a02: Late minor bump for previous changes. Also exports a few more typings related to schemas.

## 3.0.7

### Patch Changes

- Updated dependencies [8b004bd]
  - @verdant-web/common@2.1.0

## 3.0.6

### Patch Changes

- c0105e7: Fix DeepPartial type and update syntax

## 3.0.5

### Patch Changes

- Updated dependencies [4b9e3e4]
  - @verdant-web/common@2.0.3

## 3.0.4

### Patch Changes

- 5aa6531: Refresh auth token after expiration
- Updated dependencies [5aa6531]
  - @verdant-web/common@2.0.2

## 3.0.3

### Patch Changes

- d1f7e46: Attempt to fix a consistency error in rebasing

## 3.0.2

### Patch Changes

- Updated dependencies [d2bbec4]
  - @verdant-web/common@2.0.1

## 3.0.1

### Patch Changes

- f16fe63: Fix some typing issues in the CLI

## 3.0.0

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

### Patch Changes

- Updated dependencies [ba63e80]
  - @verdant-web/common@2.0.0

## 3.0.0-next.0

### Major Changes

- Major rewrite of internals for document storage to improve memory efficiency and data consistency. Introduces "pruning."

### Patch Changes

- Updated dependencies
  - @verdant-web/common@2.0.0-next.0

## 2.8.5

### Patch Changes

- 5a5a312: Fix multiple bugs handling nested files in entities
- Updated dependencies [5a5a312]
  - @verdant-web/common@1.16.2

## 2.8.4

### Patch Changes

- 6654119: Add missing event typing to sync

## 2.8.3

### Patch Changes

- Updated dependencies [56cee57]
  - @verdant-web/common@1.16.1

## 2.8.2

### Patch Changes

- f11bb2e: Fix for multiple tabs causing message cascade

## 2.8.1

### Patch Changes

- 5526ef6: Hotfix for deleting queryable storage docs in collections that no longer exist

## 2.8.0

### Minor Changes

- 594a03c: Support limited options for string fields in schema and CLI. Adds validation for field values when writing to entities.

### Patch Changes

- e96b252: Collections deleted during migrations now properly delete all related data
- Updated dependencies [594a03c]
- Updated dependencies [e96b252]
  - @verdant-web/common@1.16.0

## 2.7.10

### Patch Changes

- Updated dependencies [c686e0f]
  - @verdant-web/common@1.15.5

## 2.7.9

### Patch Changes

- 6cab5a4: Server: delete empty snapshots and don't store new empty snapshots. This shouldn't have any effect on behavior. Client: fixed a rare bug with initializing a client for the first time. CLI: fixed typings for deletable fields.

## 2.7.8

### Patch Changes

- Updated dependencies [7b3e213]
  - @verdant-web/common@1.15.4

## 2.7.7

### Patch Changes

- b0c78bf: ⚠️⚠️ This version requires updating the client and server simultaneously if your app still has legacy OIDs applied to documents. Hopefully that just means me. Does anyone else use Verdant? Anyway, this one removes those legacy OIDs completely so I don't have to worry about them anymore.

  Sorry for not really being semver-conscious here, but I really doubt it affects anyone at this point. You'd have to have been using Verdant before May 26, 2023 for this to matter to you.

- Updated dependencies [b0c78bf]
  - @verdant-web/common@1.15.3

## 2.7.7-next.0

### Patch Changes

- b0c78bf2: ⚠️⚠️ This version requires updating the client and server simultaneously if your app still has legacy OIDs applied to documents. Hopefully that just means me. Does anyone else use Verdant? Anyway, this one removes those legacy OIDs completely so I don't have to worry about them anymore.

  Sorry for not really being semver-conscious here, but I really doubt it affects anyone at this point. You'd have to have been using Verdant before May 26, 2023 for this to matter to you.

- Updated dependencies [b0c78bf2]
  - @verdant-web/common@1.15.3-next.0

## 2.7.6

### Patch Changes

- 52e9a59: Improve typings for entity.update

## 2.7.5

### Patch Changes

- dcd429c: Improve push-based sync reconnect behavior on app reopen

## 2.7.4

### Patch Changes

- 14fbf29: Yet another patch for legacy behavior. Don't let this worry you too much, this pretty much only affects my apps.
- 8b9a3cd: Don't worry about this one

## 2.7.3

### Patch Changes

- 0a4b2a1: Yet another legacy ID patch

## 2.7.2

### Patch Changes

- 633bb00: Another legacy document hotfix
- Updated dependencies [633bb00]
  - @verdant-web/common@1.15.2

## 2.7.1

### Patch Changes

- f847ec1: Hotfix for old apps using legacy "." formatted OIDs (I gotta migrate those...)
- Updated dependencies [f847ec1]
  - @verdant-web/common@1.15.1

## 2.7.0

### Minor Changes

- 64e411b: Updated how plural names are used in collections. If you've named your collection keys as the plural, this won't affect you. However, if your collections were keyed by something that didn't match with your plural name, the names of the keys you use to access queries and of your generated React hooks will change.

  To migrate, remove all `pluralName` usage in your schema, and assign your collections to the plural name of your model in the `collections` part of your schema.

- a73d381: Rewrites the CLI to fully evaluate schema code, rather than just parsing it as a Typescript AST.

  This allows schemas to import other modules and use any plain TS logic desired to define the final schema.

  Schemas are now bundled and compiled to JS before storing historical copies. The primary schema is now just a pointer to its historical version.

  Migrations now use the new `createMigration` function universally. Migrations are now generated with typings supplied by compiled historical schemas. This should make migration typings more consistent and reliable.

  This change also deprecates fields with `index: true` in favor of a new `indexes` part of a collection schema, which allows direct field pass-through indexes. This consolidates indexes in one place (or, two, with compounds...) and generally makes the typing simpler.

  Deleted a lot of extraneous TS typings.

  Store now only writes index values as top-level fields in the object written to IndexedDB. A snapshot of the object is still provided in a sub-key for future use. This should not be a noticeable change; Verdant had already phased out using the snapshot value in favor of regenerating the view from operations on first load of a document.

### Patch Changes

- e6ac22a: Attempting to modify the primary key of a document now throws an error
- ab178e2: Fix a serious bug with deleting documents whose IDs are substrings of other document IDs
- 6dab424: Added an EXPERIMENTAL_weakRefs flag to client initialization which turns on WeakRef usage for all entities in cache. This helps to evict unused entities from memory safely. However, while it passes the full (extensive) Verdant test suite, I still want to test this in real life for a while before making it the default.
- Updated dependencies [a73d381]
  - @verdant-web/common@1.15.0

## 2.6.0

### Minor Changes

- 81ca170: **Major CLI changes**:

  - The CLI now supports BETA WIP schema workflows. WIP schemas allow you to iterate on schema design locally more easily by copying your database into a temporary branch while you tune the new schema and automatically resetting it when the schema changes.
  - A new CLI command has been added: `verdant-preflight`. Include this in your CI to validate that the current schema is not WIP and ready for deployment before merging and deploying your app. Deploying a WIP schema can cause major problems for users, including data loss.
  - _Migration:_ CLI usage hasn't changed too much, but the workflow has. You'll see when you run it. It's more interactive now; no need to pass additional flags like `--force`.

  Store changes:

  - Store now supports WIP schemas. Supplying a schema with `wip: true` to the StoreDescriptor will initialize a Store with the WIP schema and copy all data from the main databases into temporary fork databases for that schema. You can then test your app with the schema changes before committing to a particular schema shape.
  - WIP schema usage disables sync! This prevents ephemeral data from being stored on the server or passed to other clients. Commit your WIP schema changes into a production schema to re-enable sync.

### Patch Changes

- 3b2ee59: An attempt to fix a particularly nasty storage bug where a race condition caused some documents to soft-delete. Their operations were still present in metadata, but the queryable snapshot was written as a deletion because the snapshot writer accessed that metadata before it was ready. I can't guarantee this fixes all issues, but it reliably passes the regression test so far.
- Updated dependencies [81ca170]
  - @verdant-web/common@1.14.1

## 2.5.8

### Patch Changes

- 28170e4: Do not apply future operations to document snapshots during migration

## 2.5.7

### Patch Changes

- e9c332a: Filter out empty doc snapshots during migration

## 2.5.6

### Patch Changes

- Updated dependencies [e2fe2aa]
  - @verdant-web/common@1.14.0

## 2.5.5

### Patch Changes

- a989af4: Add some,every,find List entity methods
- a989af4: Query.subscribe now supports specifying event to subscribe to. Former use is deprecated but still available. React paginated query hooks now supply a status parameter to check query re-validation.

## 2.5.4

### Patch Changes

- 75ff47f: Add vanilla browser bundle to build for store

## 2.5.3

### Patch Changes

- 731b5f4: Fix bug with sync and migration: clients would not be able to query certain documents created by peers after migrating.

## 2.5.2

### Patch Changes

- feb503e: Better state tracking for queries and react hooks

## 2.5.1

### Patch Changes

- c9cd46b: Fix a bug with skip-level migrations from initial

## 2.5.0

### Minor Changes

- 52d0c0c: Changing index parameters on queries with specified keys will now update and re-run the query. Also fixed a rare race condition with incoming operations via sync.

## 2.4.1

### Patch Changes

- Updated dependencies [fd55c1b]
  - @verdant-web/common@1.13.4

## 2.4.0

### Minor Changes

- 1429bfb: Verdant's client no longer applies changes from _future versions of your schema_ to local data. These changes are still stored and synced, but they will not be reflected in the application. This change is necessary to ensure data integrity with the code that's actually running on your device-- if a future schema changes the shape of the data, but the current client doesn't have that change yet, any data that reflects those changes could be reshaped and violate the expected types in the older code.

  This is technically a breaking change but I would hope nobody is relying on that behavior for some reason.

  I've added an event you can subscribe to on the client called `futureSeen`. If the client notices a change from a future version of the app, it will fire this event. You can subscribe to it to prompt the user to reload the page and get the latest code. Otherwise, in a realtime scenario, they simply won't see the changes the other client is making.

### Patch Changes

- Updated dependencies [1429bfb]
  - @verdant-web/common@1.13.3

## 2.3.2

### Patch Changes

- Updated dependencies [9f2d7f2]
  - @verdant-web/common@1.13.2

## 2.3.1

### Patch Changes

- ed6cda6: Optimistically update own presence
- 8d32085: Provide more information for some errors
- 9edb078: Experimental "downloadRemote" property for file fields, which tries to download and store the file locally for offline use if it's not already on the device.
- Updated dependencies [6075f8d]
- Updated dependencies [8d32085]
- Updated dependencies [509917c]
- Updated dependencies [9edb078]
  - @verdant-web/common@1.13.1

## 2.3.0

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

### Patch Changes

- Updated dependencies [a8c8c09]
  - @verdant-web/common@1.13.0

## 2.2.0

### Minor Changes

- c243009: (internal) remove extranous data from object IDs

### Patch Changes

- Updated dependencies [c243009]
  - @verdant-web/common@1.12.0

## 2.1.0

### Minor Changes

- 9c9a288: Include own replicas in sync auto-upgrade logic

### Patch Changes

- a1278d9: New event on sync for active syncing state - subscribe to know when potentially long-running sync is taking place

## 2.0.5

### Patch Changes

- c026fbf: Pass useBroadcastChannel to sync options to enable experimental cross-tab sync

## 2.0.4

### Patch Changes

- 7f71b60: Resync pull sync on window visible

## 2.0.3

### Patch Changes

- c298777: consistency fix for entity caching

## 2.0.2

### Patch Changes

- db43f41: Rename framework to "Verdant"
- Updated dependencies [db43f41]
  - @verdant-web/common@1.11.1

## 2.0.1

### Patch Changes

- e981912: Fix duplication in queries when multiple array index values match query

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

### Patch Changes

- Updated dependencies [9219d68]
  - @lo-fi/common@1.11.0

## 1.13.1

### Patch Changes

- d0e546d: Fix your own replica's presence showing up as a peer on a different device
- Updated dependencies [d0e546d]
  - @lo-fi/common@1.10.4

## 1.13.0

### Minor Changes

- c02e4ce: Allow adding custom mutation hooks to createHooks

## 1.12.10

### Patch Changes

- bf566ef: Fix big inefficiencies in synced baselines, overhaul highwater/ack system
- Updated dependencies [bf566ef]
  - @lo-fi/common@1.10.3

## 1.12.9

### Patch Changes

- 363dccb: Increase query cache time to enable easier preloading

## 1.12.8

### Patch Changes

- 11d9df8: Bugfix for initializing a new entity from the snapshot of an old one

## 1.12.7

### Patch Changes

- 8b6e652: Bugfix: old operations which reference deleted collections should hopefully not fail on initial sync now

## 1.12.6

### Patch Changes

- 0eeb006: Make updatedAt a number, add deepUpdatedAt
- Updated dependencies [4af8cc0]
  - @lo-fi/common@1.10.2

## 1.12.5

### Patch Changes

- 4548567: Add an 'updatedAt' timestamp to Entity which reflects the wall time of the last applied operation
- Updated dependencies [4548567]
  - @lo-fi/common@1.10.1

## 1.12.4

### Patch Changes

- 06c2bd2: Resilience against data inconsistency during migration

## 1.12.3

### Patch Changes

- c3bf6b4: More resiliency for bad data states

## 1.12.2

### Patch Changes

- 70e5790: Bugfix for index values being diffed during a migration

## 1.12.1

### Patch Changes

- 2b16623: Attempted bugfix for gnocchi.club

## 1.12.0

### Minor Changes

- 0c5dc4c: Big update to increase consistency of sync and patch up some faulty assumptions in the protocol. NOTE: clients may re-sync the whole library upon connection after upgrade, but this should only happen once.

### Patch Changes

- Updated dependencies [0c5dc4c]
  - @lo-fi/common@1.10.0

## 1.11.1

### Patch Changes

- bc7b6ad: Several fixes for file behaviors
- bc0d96f: Allow clearing undo history

## 1.11.0

### Minor Changes

- 6aae4d6: Support for file fields, file uploads and storage

### Patch Changes

- Updated dependencies [6aae4d6]
- Updated dependencies [55ffd63]
  - @lo-fi/common@1.9.0

## 1.10.11

### Patch Changes

- 01936cf: Fix a bug in undo list delete
- 7252c6b: Revert attempt at mocking indexeddb for servers
- Updated dependencies [01936cf]
  - @lo-fi/common@1.8.4

## 1.10.10

### Patch Changes

- cd41849: Attempt to make client isomorphic

## 1.10.9

### Patch Changes

- b879919: Update and fix some react usages
- Updated dependencies [b879919]
  - @lo-fi/common@1.8.3

## 1.10.8

### Patch Changes

- Updated dependencies [023abf8]
  - @lo-fi/common@1.8.2

## 1.10.7

### Patch Changes

- 1bc2b2d: Fix import
- Updated dependencies [1bc2b2d]
  - @lo-fi/common@1.8.1

## 1.10.6

### Patch Changes

- f4917a4: Fix major bug with desc.open(), rollback WeakRef usage
- Updated dependencies [0c93e2e]
  - @lo-fi/common@1.8.0

## 1.10.5

### Patch Changes

- b13d81d: Bugfix: list deletes were not pruning lists

## 1.10.4

### Patch Changes

- 15ed2a2: Skippable hooks, new advanced hooks, configurable sync

## 1.10.3

### Patch Changes

- 3dbe685: Dynamically set pull interval for sync

## 1.10.2

### Patch Changes

- Updated dependencies [aa40deb]
  - @lo-fi/common@1.7.1

## 1.10.1

### Patch Changes

- 2f7ec9a: Apply defaults to sub-objects created in .update

## 1.10.0

### Minor Changes

- 272e859: Fix a big bug in .update on entities erasing properties

### Patch Changes

- Updated dependencies [272e859]
- Updated dependencies [28fdcbb]
  - @lo-fi/common@1.7.0

## 1.9.0

### Minor Changes

- 8c95fbc: Expose method to reset server-side data for a library

### Patch Changes

- Updated dependencies [8c95fbc]
  - @lo-fi/common@1.6.0

## 1.8.1

### Patch Changes

- 5df835e: fix push/pull sync timing

## 1.8.0

### Minor Changes

- 49d7f88: Advanced batching and undo control. Bugfixes for undo application.

### Patch Changes

- Updated dependencies [49d7f88]
  - @lo-fi/common@1.5.0

## 1.7.2

### Patch Changes

- 4a9a9c8: Add sources to npm files
- Updated dependencies [b1a4646]
- Updated dependencies [4a9a9c8]
  - @lo-fi/common@1.4.5

## 1.7.1

### Patch Changes

- fab4656: New more compact timestamp format
- Updated dependencies [fab4656]
  - @lo-fi/common@1.4.4

## 1.7.0

### Minor Changes

- 20419d8: Experimental import/export feature

## 1.6.7

### Patch Changes

- a7113ed: fix useWatch typings

## 1.6.6

### Patch Changes

- b03fa61: Refactor for sync stability
- Updated dependencies [b03fa61]
  - @lo-fi/common@1.4.3

## 1.6.5

### Patch Changes

- c0d8b3f: Catch storage write errors

## 1.6.4

### Patch Changes

- Updated dependencies [f13043f]
  - @lo-fi/common@1.4.2

## 1.6.3

### Patch Changes

- 1486b2f: More advanced watch tools for changes
- Updated dependencies [1486b2f]
  - @lo-fi/common@1.4.1

## 1.6.2

### Patch Changes

- 6d88c9f: Fix to remove promise from getCached

## 1.6.1

### Patch Changes

- e87c01b: Expose a getCached method for retrieving cached entities

## 1.6.0

### Minor Changes

- 0562878: Overhaul migrations to include arbitrary mutations and querying

### Patch Changes

- Updated dependencies [0562878]
  - @lo-fi/common@1.4.0

## 1.5.0

### Minor Changes

- 7eeee9e: Rework entity typings and codegen

## 1.4.4

### Patch Changes

- 5ff038a: add sanitize index value function
- Updated dependencies [5ff038a]
  - @lo-fi/common@1.3.3

## 1.4.3

### Patch Changes

- 4ebc8c2: Support more index value types

## 1.4.2

### Patch Changes

- d5f9c4a: Clean up baselines on deletion

## 1.4.1

### Patch Changes

- 70b9a88: Fix useWatch, allow null ID in usePeer
- Updated dependencies [b2fe1f9]
  - @lo-fi/common@1.3.2

## 1.4.0

### Minor Changes

- 54ec520: Variable typing of Presence and Profile. Continuing to reduce typing complexity internally in the library.

## 1.3.4

### Patch Changes

- 9321cb0: Expose undo hooks
- ef12284: Fix pull sync giving up after a failure

## 1.3.3

### Patch Changes

- 5c7a6b0: bugfix: fix deleting entities and querying. fix sending messages while sync is paused.

## 1.3.2

### Patch Changes

- 895fda4: Add startsWith filter for string fields
- Updated dependencies [895fda4]
  - @lo-fi/common@1.3.1

## 1.3.1

### Patch Changes

- 95da5c8: Fix FireFox support by removing unsupported method usage

## 1.3.0

### Minor Changes

- 8369c49: Add deep change subscription. Lots of consistency fixes. More performant diffing of nested updates. Overhaul OID internal storage mechanism. Presence update batching.

### Patch Changes

- Updated dependencies [8369c49]
  - @lo-fi/common@1.3.0

## 1.2.0

### Minor Changes

- 0e11d9b: Big internal refactoring to improve performance and consistency. Major bugfixes to undo, sync exchanges.

### Patch Changes

- Updated dependencies [0e11d9b]
  - @lo-fi/common@1.2.0

## 1.1.5

### Patch Changes

- 0e7299e: Remove unique field option. Add default values during default migrations.
- Updated dependencies [0e7299e]
  - @lo-fi/common@1.1.4

## 1.1.4

### Patch Changes

- d7f2561: hotfix: don't delete indexed fields, only synthetics
- Updated dependencies [d7f2561]
  - @lo-fi/common@1.1.3

## 1.1.3

### Patch Changes

- 617a84c: Add integration tests for migration and fix several bugs
- Updated dependencies [617a84c]
  - @lo-fi/common@1.1.2

## 1.1.2

### Patch Changes

- 16aeb5b: fix bug crashing hooks if used twice

## 1.1.1

### Patch Changes

- 03b40f3: Add sort filter, fix bugs with diff and filters
- Updated dependencies [03b40f3]
  - @lo-fi/common@1.1.1

## 1.1.0

### Minor Changes

- f3bd34f: use more descriptive oids

### Patch Changes

- Updated dependencies [f3bd34f]
  - @lo-fi/common@1.1.0

## 1.0.7

### Patch Changes

- 1571c72: bugfixes for usage

## 1.0.6

### Patch Changes

- 2560a63: Add passive and read-only replica types
- Updated dependencies [2560a63]
  - @lo-fi/common@1.0.3

## 1.0.5

### Patch Changes

- 18e45b1: add sub-object typings to cli
- 18e45b1: fix typing error in entity data

## 1.0.4

### Patch Changes

- Updated dependencies [d29193f]
  - @lo-fi/common@1.0.2

## 1.0.3

### Patch Changes

- f8080ea: expose and generate types for delete all

## 1.0.2

### Patch Changes

- 5edff26: add delete all method

## 1.0.1

### Patch Changes

- 5f89e31: fix delete not affecting sub-object
- Updated dependencies [5f89e31]
  - @lo-fi/common@1.0.1

## 1.0.0

### Minor Changes

- 7c87fdd: Undo and redo, more aggressive rebasing

### Patch Changes

- Updated dependencies [7c87fdd]
  - @lo-fi/common@1.0.0

## 0.3.1

### Patch Changes

- 1ca6303: Fix a big initial sync issues when joining library with existing baslines

## 0.3.0

### Minor Changes

- 5c4a92d: Separate auth into its own endpoint

### Patch Changes

- Updated dependencies [5c4a92d]
  - @lo-fi/common@0.3.0

## 0.2.2

### Patch Changes

- 2c7083f: fix missing presence with http sync
- 3366b20: Consolidate operation storage size
- 7f5210c: Restore schema comparison migration check

## 0.2.1

### Patch Changes

- 7a333aa: default field values
- 0497ebe: make schema indexes optional
- Updated dependencies [7a333aa]
- Updated dependencies [0497ebe]
  - @lo-fi/common@0.2.1

## 0.2.0

### Minor Changes

- dd0e3a8: Hybrid push/pull sync for solo clients

### Patch Changes

- 50f7ca0: rename sync to ServerSync, don't require it by default
- Updated dependencies [dd0e3a8]
  - @lo-fi/common@0.2.0

## 0.1.3

### Patch Changes

- fa2e4a8: bugfixes

## 0.1.2

### Patch Changes

- c7e541f: plural client collection names, fix generator bugs

## 0.1.1

### Patch Changes

- 3f71be4: Added CLI to generate client typings
- Updated dependencies [3f71be4]
  - @lo-fi/common@0.1.1

## 0.1.0

### Patch Changes

- 19bc8f2: Added 'any' field type to schema
- 3d2e2e5: support plural name in hooks
- Updated dependencies [19bc8f2]
- Updated dependencies [3d2e2e5]
  - @lo-fi/common@0.1.0
