# @lo-fi/cli

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
