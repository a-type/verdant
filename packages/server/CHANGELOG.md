# @lo-fi/server

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
