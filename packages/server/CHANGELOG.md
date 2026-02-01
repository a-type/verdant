# @lo-fi/server

## 4.2.3

### Patch Changes

- c94dbe9: Restore hibernated websocket connections to fix rebroadcasting problem after hibernation

## 4.2.2

### Patch Changes

- f3aacef: Tweak presence timings for more robustness
- 7549577: Add log for message handling

## 4.2.1

### Patch Changes

- Updated dependencies [8c3ff5d]
  - @verdant-web/common@3.2.0

## 4.2.0

### Minor Changes

- 38e3c3a: Support different presence storage backends

## 4.1.1

### Patch Changes

- 73e0e86: make do websocket presence sturdier

## 4.1.0

### Minor Changes

- c105238: explicit disconnect message, looser presence enforcement in DO

### Patch Changes

- Updated dependencies [c105238]
  - @verdant-web/common@3.1.0

## 4.0.4

### Patch Changes

- 8a1e494: Improvements for DO websocket presence

## 4.0.3

### Patch Changes

- ad19b53: fix typing of replicas

## 4.0.2

### Patch Changes

- 6d79912: Refine some server reset sync logic

## 4.0.1

### Patch Changes

- 71f884f: Put profiles back on replica info

## 4.0.0

### Major Changes

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

## 3.3.11

### Patch Changes

- Updated dependencies [f0254d4]
  - @verdant-web/common@2.9.1

## 3.3.10

### Patch Changes

- Updated dependencies [f2193b5]
  - @verdant-web/common@2.9.0

## 3.3.9

### Patch Changes

- Updated dependencies [c793e54]
  - @verdant-web/common@2.8.0

## 3.3.8

### Patch Changes

- Updated dependencies [005cf3d]
  - @verdant-web/common@2.7.3

## 3.3.7

### Patch Changes

- Updated dependencies [8466924]
  - @verdant-web/common@2.7.2

## 3.3.6

### Patch Changes

- Updated dependencies [9e863cc]
  - @verdant-web/common@2.7.1

## 3.3.5

### Patch Changes

- 4312c3f: Server: fixed bug with demo server loading files with spaces in filenames. Store: Fixed a bug which caused files not immediately uploaded to end up on the server with a filename "blob" instead of the original filename.

## 3.3.4

### Patch Changes

- f2511398: Update better-sqlite dependency for later Node compatibility
- d10665df: Improve replica server order record-keeping and avoid forcing a reset of truant replicas if their server order is still up to date.
- Updated dependencies [b5d15631]
  - @verdant-web/common@2.7.0

## 3.3.4-alpha.2

### Patch Changes

- f2511398: Update better-sqlite dependency for later Node compatibility

## 3.3.4-alpha.1

### Patch Changes

- d10665df: Improve replica server order record-keeping and avoid forcing a reset of truant replicas if their server order is still up to date.

## 3.3.4-alpha.0

### Patch Changes

- Updated dependencies [b5d15631]
  - @verdant-web/common@2.7.0-alpha.0

## 3.3.3

### Patch Changes

- 423493cf: Major internal refactoring of persistence layer. Verdant still only supports IndexedDB for now, but this is a huge step toward configurable storage. Prereleasing this version to test in real-world environments.
- 1787ef97: Official release of refactored persistence layer! This doesn't have much functional impact for users, but some advanced/experimental config settings have changed. Store now requires a recently generated client via CLI; be sure to upgrade CLI and regenerate your client from your schema even if your schema hasn't changed.
- Updated dependencies [423493cf]
- Updated dependencies [1787ef97]
- Updated dependencies [5576e5ee]
  - @verdant-web/common@2.6.0

## 3.3.3-next.1

### Patch Changes

- Updated dependencies [5576e5ee]
  - @verdant-web/common@2.6.0-next.1

## 3.3.3-next.0

### Patch Changes

- 423493cf: Major internal refactoring of persistence layer. Verdant still only supports IndexedDB for now, but this is a huge step toward configurable storage. Prereleasing this version to test in real-world environments.
- Updated dependencies [423493cf]
  - @verdant-web/common@2.6.0-next.0

## 3.3.2

### Patch Changes

- Updated dependencies [729a908e]
  - @verdant-web/common@2.5.2

## 3.3.1

### Patch Changes

- Updated dependencies [31f59a77]
  - @verdant-web/common@2.5.1

## 3.3.0

### Minor Changes

- fe020adb: Add "internal" presence concepts which use presence machinery to power built-in features. Starting with "view ID" which encodes the 'view' the user is looking at, further refining presence peer relationships for apps with multiple distinct views. This version also adds a cleanup callback to the router's route onVisited callback.

### Patch Changes

- Updated dependencies [fe020adb]
  - @verdant-web/common@2.5.0

## 3.2.0

### Minor Changes

- 4679a9fb: Authorized document access full release
- 5882e6dc: Introduces document access control. It's now possible to mark specific documents as 'private,' which restricts access of these documents to only the current user's devices in sync scenarios. Access controls have no effect on local-only databases, but are still advised for use since these libraries might sync someday in the future. See the docs for information on how to assign access control and caveats about usage.

### Patch Changes

- Updated dependencies [91ab8cd7]
- Updated dependencies [4679a9fb]
- Updated dependencies [5882e6dc]
  - @verdant-web/common@2.4.0

## 3.2.0-next.1

### Patch Changes

- Updated dependencies [91ab8cd7]
  - @verdant-web/common@2.4.0-next.1

## 3.2.0-next.0

### Minor Changes

- 5882e6dc: Introduces document access control. It's now possible to mark specific documents as 'private,' which restricts access of these documents to only the current user's devices in sync scenarios. Access controls have no effect on local-only databases, but are still advised for use since these libraries might sync someday in the future. See the docs for information on how to assign access control and caveats about usage.

### Patch Changes

- Updated dependencies [5882e6dc]
  - @verdant-web/common@2.4.0-next.0

## 3.1.3

### Patch Changes

- d0c8fd5e: Fix a bug which made replicas which have been offline for a long time fail to sync back up

## 3.1.2

### Patch Changes

- 2ec1a25: Restore binary demo server which got deleted for some reason

## 3.1.1

### Patch Changes

- 1e82d62: Fix shard conversion for large databases

## 3.1.0

### Minor Changes

- 27e7587: New storage options: You can now configure Verdant with `sqlShardStorage`, which stores each library in a different database file. This is swappable with `sqlStorage` using configuration which automatically copies data from the old single database into sharded ones. Additionally, WAL mode is now enabled by default on all SQLite-backed storage options.

## 3.0.5

### Patch Changes

- Updated dependencies [d876471]
  - @verdant-web/common@2.3.4

## 3.0.4

### Patch Changes

- Updated dependencies [c9a0183]
  - @verdant-web/common@2.3.3

## 3.0.3

### Patch Changes

- Updated dependencies [91a6a64]
  - @verdant-web/common@2.3.2

## 3.0.2

### Patch Changes

- Updated dependencies [1ab35f2]
  - @verdant-web/common@2.3.1

## 3.0.1

### Patch Changes

- 2add1d9: Important: fixes accidental operation deletion in rebasing logic

## 3.0.0

### Major Changes

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

## 3.0.0-next.0

### Major Changes

- 43edd7a: Introduces support for custom server storage solutions via interface implementation. This change also makes server storage queries and writes async (they weren't before), which improves compatibility with custom solutions and performance overall with high message concurrency.

### Patch Changes

- Updated dependencies [43edd7a]
  - @verdant-web/common@2.3.0-next.0

## 2.1.3

### Patch Changes

- a99d9a4: Add types for libraryInfo. Return null if library is not stored in the database.

## 2.1.2

### Patch Changes

- Updated dependencies [4077465]
  - @verdant-web/common@2.2.0

## 2.1.1

### Patch Changes

- cffabae: fix http server attachment mistake in last release. only affected passing httpServer to Verdant Server constructor

## 2.1.0

### Minor Changes

- 3bd652f: Support fetch-style server integration using new server methods.

## 2.0.8

### Patch Changes

- 11d2e0a: Add 'attach' option to server. Change default path to /sync instead of /lofi

## 2.0.7

### Patch Changes

- Updated dependencies [e4f0720]
  - @verdant-web/common@2.1.1

## 2.0.6

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

- Updated dependencies [8b004bd]
  - @verdant-web/common@2.1.0

## 2.0.5

### Patch Changes

- Updated dependencies [4b9e3e4]
  - @verdant-web/common@2.0.3

## 2.0.4

### Patch Changes

- 5aa6531: Refresh auth token after expiration
- Updated dependencies [5aa6531]
  - @verdant-web/common@2.0.2

## 2.0.3

### Patch Changes

- 7bc2ca3: Fix server cli shebang

## 2.0.2

### Patch Changes

- d1f7e46: Attempt to fix a consistency error in rebasing

## 2.0.1

### Patch Changes

- d2bbec4: Add standalone server CLI command
- Updated dependencies [d2bbec4]
  - @verdant-web/common@2.0.1

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

### Patch Changes

- Updated dependencies [ba63e80]
  - @verdant-web/common@2.0.0

## 2.0.0-next.0

### Major Changes

- Major rewrite of internals for document storage to improve memory efficiency and data consistency. Introduces "pruning."

### Patch Changes

- Updated dependencies
  - @verdant-web/common@2.0.0-next.0

## 1.9.4

### Patch Changes

- Updated dependencies [5a5a312]
  - @verdant-web/common@1.16.2

## 1.9.3

### Patch Changes

- Updated dependencies [56cee57]
  - @verdant-web/common@1.16.1

## 1.9.2

### Patch Changes

- Updated dependencies [594a03c]
- Updated dependencies [e96b252]
  - @verdant-web/common@1.16.0

## 1.9.1

### Patch Changes

- Updated dependencies [c686e0f]
  - @verdant-web/common@1.15.5

## 1.9.0

### Minor Changes

- 6cab5a4: Server: delete empty snapshots and don't store new empty snapshots. This shouldn't have any effect on behavior. Client: fixed a rare bug with initializing a client for the first time. CLI: fixed typings for deletable fields.

## 1.8.15

### Patch Changes

- Updated dependencies [7b3e213]
  - @verdant-web/common@1.15.4

## 1.8.14

### Patch Changes

- 7bfad6f: Fix null snapshot migration on server
- b0c78bf: ⚠️⚠️ This version requires updating the client and server simultaneously if your app still has legacy OIDs applied to documents. Hopefully that just means me. Does anyone else use Verdant? Anyway, this one removes those legacy OIDs completely so I don't have to worry about them anymore.

  Sorry for not really being semver-conscious here, but I really doubt it affects anyone at this point. You'd have to have been using Verdant before May 26, 2023 for this to matter to you.

- Updated dependencies [b0c78bf]
  - @verdant-web/common@1.15.3

## 1.8.14-next.1

### Patch Changes

- 7bfad6fd: Fix null snapshot migration on server

## 1.8.14-next.0

### Patch Changes

- b0c78bf2: ⚠️⚠️ This version requires updating the client and server simultaneously if your app still has legacy OIDs applied to documents. Hopefully that just means me. Does anyone else use Verdant? Anyway, this one removes those legacy OIDs completely so I don't have to worry about them anymore.

  Sorry for not really being semver-conscious here, but I really doubt it affects anyone at this point. You'd have to have been using Verdant before May 26, 2023 for this to matter to you.

- Updated dependencies [b0c78bf2]
  - @verdant-web/common@1.15.3-next.0

## 1.8.13

### Patch Changes

- Updated dependencies [633bb00]
  - @verdant-web/common@1.15.2

## 1.8.12

### Patch Changes

- Updated dependencies [f847ec1]
  - @verdant-web/common@1.15.1

## 1.8.11

### Patch Changes

- Updated dependencies [a73d381]
  - @verdant-web/common@1.15.0

## 1.8.10

### Patch Changes

- Updated dependencies [81ca170]
  - @verdant-web/common@1.14.1

## 1.8.9

### Patch Changes

- Updated dependencies [e2fe2aa]
  - @verdant-web/common@1.14.0

## 1.8.8

### Patch Changes

- 037e9b5: Add truancy to replica info api

## 1.8.7

### Patch Changes

- 7ec5730: Include more replica information in server info API

## 1.8.6

### Patch Changes

- 6a5382c: Add metadata API for retrieving advanced info about a library

## 1.8.5

### Patch Changes

- Updated dependencies [fd55c1b]
  - @verdant-web/common@1.13.4

## 1.8.4

### Patch Changes

- Updated dependencies [1429bfb]
  - @verdant-web/common@1.13.3

## 1.8.3

### Patch Changes

- Updated dependencies [9f2d7f2]
  - @verdant-web/common@1.13.2

## 1.8.2

### Patch Changes

- Updated dependencies [6075f8d]
- Updated dependencies [8d32085]
- Updated dependencies [509917c]
- Updated dependencies [9edb078]
  - @verdant-web/common@1.13.1

## 1.8.1

### Patch Changes

- Updated dependencies [a8c8c09]
  - @verdant-web/common@1.13.0

## 1.8.0

### Minor Changes

- c243009: (internal) remove extranous data from object IDs

### Patch Changes

- Updated dependencies [c243009]
  - @verdant-web/common@1.12.0

## 1.7.10

### Patch Changes

- c298777: Handle server errors during message processing.

## 1.7.9

### Patch Changes

- db43f41: Rename framework to "Verdant"
- Updated dependencies [db43f41]
  - @verdant-web/common@1.11.1

## 1.7.8

### Patch Changes

- Updated dependencies [9219d68]
  - @lo-fi/common@1.11.0

## 1.7.7

### Patch Changes

- Updated dependencies [d0e546d]
  - @lo-fi/common@1.10.4

## 1.7.6

### Patch Changes

- b292b71: Update usage of server change event

## 1.7.5

### Patch Changes

- 32dcc88: Subscribe to changes server-side

## 1.7.4

### Patch Changes

- bf566ef: Fix big inefficiencies in synced baselines, overhaul highwater/ack system
- Updated dependencies [bf566ef]
  - @lo-fi/common@1.10.3

## 1.7.3

### Patch Changes

- 9c1d282: Support files in snapshots

## 1.7.2

### Patch Changes

- Updated dependencies [4af8cc0]
  - @lo-fi/common@1.10.2

## 1.7.1

### Patch Changes

- Updated dependencies [4548567]
  - @lo-fi/common@1.10.1

## 1.7.0

### Minor Changes

- 0c5dc4c: Big update to increase consistency of sync and patch up some faulty assumptions in the protocol. NOTE: clients may re-sync the whole library upon connection after upgrade, but this should only happen once.

### Patch Changes

- Updated dependencies [0c5dc4c]
  - @lo-fi/common@1.10.0

## 1.6.3

### Patch Changes

- bc7b6ad: Several fixes for file behaviors

## 1.6.2

### Patch Changes

- 5a5c2d5: Support async file url source

## 1.6.1

### Patch Changes

- 378fcd9: Export file stuff

## 1.6.0

### Minor Changes

- 6aae4d6: Support for file fields, file uploads and storage

### Patch Changes

- Updated dependencies [6aae4d6]
- Updated dependencies [55ffd63]
  - @lo-fi/common@1.9.0

## 1.5.2

### Patch Changes

- Updated dependencies [01936cf]
  - @lo-fi/common@1.8.4

## 1.5.1

### Patch Changes

- Updated dependencies [b879919]
  - @lo-fi/common@1.8.3

## 1.5.0

### Minor Changes

- 023abf8: Server API for document snapshots

### Patch Changes

- Updated dependencies [023abf8]
  - @lo-fi/common@1.8.2

## 1.4.2

### Patch Changes

- 537944b: Expose API for removing a user from a library

## 1.4.1

### Patch Changes

- Updated dependencies [1bc2b2d]
  - @lo-fi/common@1.8.1

## 1.4.0

### Minor Changes

- 0c93e2e: Update replica metadata to key on library ID so a replica which connects to different libraries does not wind up with incorrect metadata

### Patch Changes

- Updated dependencies [0c93e2e]
  - @lo-fi/common@1.8.0

## 1.3.3

### Patch Changes

- beaffd5: Expose presence API from server

## 1.3.2

### Patch Changes

- Updated dependencies [aa40deb]
  - @lo-fi/common@1.7.1

## 1.3.1

### Patch Changes

- Updated dependencies [272e859]
- Updated dependencies [28fdcbb]
  - @lo-fi/common@1.7.0

## 1.3.0

### Minor Changes

- 8c95fbc: Expose method to reset server-side data for a library

### Patch Changes

- Updated dependencies [8c95fbc]
  - @lo-fi/common@1.6.0

## 1.2.10

### Patch Changes

- Updated dependencies [49d7f88]
  - @lo-fi/common@1.5.0

## 1.2.9

### Patch Changes

- 4a9a9c8: Add sources to npm files
- Updated dependencies [b1a4646]
- Updated dependencies [4a9a9c8]
  - @lo-fi/common@1.4.5

## 1.2.8

### Patch Changes

- fab4656: New more compact timestamp format
- Updated dependencies [fab4656]
  - @lo-fi/common@1.4.4

## 1.2.7

### Patch Changes

- b03fa61: Refactor for sync stability
- Updated dependencies [b03fa61]
  - @lo-fi/common@1.4.3

## 1.2.6

### Patch Changes

- Updated dependencies [f13043f]
  - @lo-fi/common@1.4.2

## 1.2.5

### Patch Changes

- Updated dependencies [1486b2f]
  - @lo-fi/common@1.4.1

## 1.2.4

### Patch Changes

- Updated dependencies [0562878]
  - @lo-fi/common@1.4.0

## 1.2.3

### Patch Changes

- Updated dependencies [5ff038a]
  - @lo-fi/common@1.3.3

## 1.2.2

### Patch Changes

- Updated dependencies [b2fe1f9]
  - @lo-fi/common@1.3.2

## 1.2.1

### Patch Changes

- Updated dependencies [895fda4]
  - @lo-fi/common@1.3.1

## 1.2.0

### Minor Changes

- 8369c49: Add deep change subscription. Lots of consistency fixes. More performant diffing of nested updates. Overhaul OID internal storage mechanism. Presence update batching.

### Patch Changes

- Updated dependencies [8369c49]
  - @lo-fi/common@1.3.0

## 1.1.0

### Minor Changes

- 0e11d9b: Big internal refactoring to improve performance and consistency. Major bugfixes to undo, sync exchanges.

### Patch Changes

- Updated dependencies [0e11d9b]
  - @lo-fi/common@1.2.0

## 1.0.10

### Patch Changes

- Updated dependencies [0e7299e]
  - @lo-fi/common@1.1.4

## 1.0.9

### Patch Changes

- d7f2561: hotfix: don't delete indexed fields, only synthetics
- Updated dependencies [d7f2561]
  - @lo-fi/common@1.1.3

## 1.0.8

### Patch Changes

- Updated dependencies [617a84c]
  - @lo-fi/common@1.1.2

## 1.0.7

### Patch Changes

- 139c2fe: bugfix attempt for pull sync

## 1.0.6

### Patch Changes

- Updated dependencies [03b40f3]
  - @lo-fi/common@1.1.1

## 1.0.5

### Patch Changes

- Updated dependencies [f3bd34f]
  - @lo-fi/common@1.1.0

## 1.0.4

### Patch Changes

- e7447f0: bugfix for column addition

## 1.0.3

### Patch Changes

- 2560a63: Add passive and read-only replica types
- Updated dependencies [2560a63]
  - @lo-fi/common@1.0.3

## 1.0.2

### Patch Changes

- Updated dependencies [d29193f]
  - @lo-fi/common@1.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [5f89e31]
  - @lo-fi/common@1.0.1

## 1.0.0

### Minor Changes

- 7c87fdd: Undo and redo, more aggressive rebasing

### Patch Changes

- Updated dependencies [7c87fdd]
  - @lo-fi/common@1.0.0

## 0.3.0

### Minor Changes

- 5c4a92d: Separate auth into its own endpoint

### Patch Changes

- Updated dependencies [5c4a92d]
  - @lo-fi/common@0.3.0

## 0.2.2

### Patch Changes

- 7f5210c: Restore schema comparison migration check

## 0.2.1

### Patch Changes

- Updated dependencies [7a333aa]
- Updated dependencies [0497ebe]
  - @lo-fi/common@0.2.1

## 0.2.0

### Minor Changes

- dd0e3a8: Hybrid push/pull sync for solo clients

### Patch Changes

- Updated dependencies [dd0e3a8]
  - @lo-fi/common@0.2.0

## 0.1.2

### Patch Changes

- 9caecdb: nil check for replica info in baselining

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
