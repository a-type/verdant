# @verdant-web/common

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
