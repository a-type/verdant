# @lo-fi/web

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
