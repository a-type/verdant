# @lo-fi/web

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
