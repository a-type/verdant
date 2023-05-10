# @lo-fi/react

## 15.0.2

### Patch Changes

- db43f41: Rename framework to "Verdant"
- Updated dependencies [db43f41]
  - @verdant-web/common@1.11.1
  - @verdant-web/store@2.0.2

## 15.0.1

### Patch Changes

- 228bdad: remove log from hooks
- Updated dependencies [e981912]
  - @lo-fi/web@2.0.1

## 15.0.0

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

### Patch Changes

- Updated dependencies [9219d68]
  - @lo-fi/web@2.0.0
  - @lo-fi/common@1.11.0

## 14.0.1

### Patch Changes

- Updated dependencies [d0e546d]
  - @lo-fi/common@1.10.4
  - @lo-fi/web@1.13.1

## 14.0.0

### Minor Changes

- c02e4ce: Allow adding custom mutation hooks to createHooks

### Patch Changes

- Updated dependencies [c02e4ce]
  - @lo-fi/web@1.13.0

## 13.0.3

### Patch Changes

- Updated dependencies [bf566ef]
  - @lo-fi/common@1.10.3
  - @lo-fi/web@1.12.10

## 13.0.2

### Patch Changes

- Updated dependencies [0eeb006]
- Updated dependencies [4af8cc0]
  - @lo-fi/web@1.12.6
  - @lo-fi/common@1.10.2

## 13.0.1

### Patch Changes

- Updated dependencies [4548567]
  - @lo-fi/common@1.10.1
  - @lo-fi/web@1.12.5

## 13.0.0

### Patch Changes

- Updated dependencies [0c5dc4c]
  - @lo-fi/common@1.10.0
  - @lo-fi/web@1.12.0

## 12.0.1

### Patch Changes

- bc7b6ad: Several fixes for file behaviors
- Updated dependencies [bc7b6ad]
- Updated dependencies [bc0d96f]
  - @lo-fi/web@1.11.1

## 12.0.0

### Patch Changes

- Updated dependencies [6aae4d6]
- Updated dependencies [55ffd63]
  - @lo-fi/common@1.9.0
  - @lo-fi/web@1.11.0

## 11.1.5

### Patch Changes

- Updated dependencies [01936cf]
- Updated dependencies [7252c6b]
  - @lo-fi/common@1.8.4
  - @lo-fi/web@1.10.11

## 11.1.4

### Patch Changes

- cd41849: Attempt to make client isomorphic
- Updated dependencies [cd41849]
  - @lo-fi/web@1.10.10

## 11.1.3

### Patch Changes

- b879919: Update and fix some react usages
- Updated dependencies [b879919]
  - @lo-fi/common@1.8.3
  - @lo-fi/web@1.10.9

## 11.1.2

### Patch Changes

- Updated dependencies [023abf8]
  - @lo-fi/common@1.8.2
  - @lo-fi/web@1.10.8

## 11.1.1

### Patch Changes

- 036c747: Fix useFindPeers infinite loop

## 11.1.0

### Minor Changes

- 5587bbf: Fix hook typings to correctly suggest that any query result may be null

### Patch Changes

- Updated dependencies [1bc2b2d]
  - @lo-fi/common@1.8.1
  - @lo-fi/web@1.10.7

## 11.0.4

### Patch Changes

- Updated dependencies [f4917a4]
- Updated dependencies [0c93e2e]
  - @lo-fi/web@1.10.6
  - @lo-fi/common@1.8.0

## 11.0.3

### Patch Changes

- 15ed2a2: Skippable hooks, new advanced hooks, configurable sync
- Updated dependencies [15ed2a2]
  - @lo-fi/web@1.10.4

## 11.0.2

### Patch Changes

- d5c8187: Hook for querying peers
- Updated dependencies [3dbe685]
  - @lo-fi/web@1.10.3

## 11.0.1

### Patch Changes

- Updated dependencies [aa40deb]
  - @lo-fi/common@1.7.1
  - @lo-fi/web@1.10.2

## 11.0.0

### Patch Changes

- Updated dependencies [272e859]
- Updated dependencies [28fdcbb]
  - @lo-fi/common@1.7.0
  - @lo-fi/web@1.10.0

## 10.0.0

### Patch Changes

- Updated dependencies [8c95fbc]
  - @lo-fi/common@1.6.0
  - @lo-fi/web@1.9.0

## 9.0.0

### Patch Changes

- Updated dependencies [49d7f88]
  - @lo-fi/common@1.5.0
  - @lo-fi/web@1.8.0

## 8.0.2

### Patch Changes

- 4a9a9c8: Add sources to npm files
- Updated dependencies [b1a4646]
- Updated dependencies [4a9a9c8]
  - @lo-fi/common@1.4.5
  - @lo-fi/web@1.7.2

## 8.0.1

### Patch Changes

- Updated dependencies [fab4656]
  - @lo-fi/common@1.4.4
  - @lo-fi/web@1.7.1

## 8.0.0

### Patch Changes

- Updated dependencies [20419d8]
  - @lo-fi/web@1.7.0

## 7.0.3

### Patch Changes

- Updated dependencies [b03fa61]
  - @lo-fi/common@1.4.3
  - @lo-fi/web@1.6.6

## 7.0.2

### Patch Changes

- 91f4c5f: Add declarative sync control in React
- Updated dependencies [f13043f]
  - @lo-fi/common@1.4.2
  - @lo-fi/web@1.6.4

## 7.0.1

### Patch Changes

- Updated dependencies [1486b2f]
  - @lo-fi/common@1.4.1
  - @lo-fi/web@1.6.3

## 7.0.0

### Patch Changes

- Updated dependencies [0562878]
  - @lo-fi/common@1.4.0
  - @lo-fi/web@1.6.0

## 6.0.0

### Patch Changes

- Updated dependencies [7eeee9e]
  - @lo-fi/web@1.5.0

## 5.0.3

### Patch Changes

- Updated dependencies [5ff038a]
  - @lo-fi/common@1.3.3
  - @lo-fi/web@1.4.4

## 5.0.2

### Patch Changes

- 7e380cc: Auto-open client descriptor when used in React
- Updated dependencies [d5f9c4a]
  - @lo-fi/web@1.4.2

## 5.0.1

### Patch Changes

- 70b9a88: Fix useWatch, allow null ID in usePeer
- Updated dependencies [b2fe1f9]
- Updated dependencies [70b9a88]
  - @lo-fi/common@1.3.2
  - @lo-fi/web@1.4.1

## 5.0.0

### Minor Changes

- 54ec520: Variable typing of Presence and Profile. Continuing to reduce typing complexity internally in the library.

### Patch Changes

- Updated dependencies [54ec520]
  - @lo-fi/web@1.4.0

## 4.0.2

### Patch Changes

- 9321cb0: Expose undo hooks
- Updated dependencies [9321cb0]
- Updated dependencies [ef12284]
  - @lo-fi/web@1.3.4

## 4.0.1

### Patch Changes

- Updated dependencies [895fda4]
  - @lo-fi/common@1.3.1
  - @lo-fi/web@1.3.2

## 4.0.0

### Patch Changes

- Updated dependencies [8369c49]
  - @lo-fi/common@1.3.0
  - @lo-fi/web@1.3.0

## 3.0.0

### Minor Changes

- 0e11d9b: Big internal refactoring to improve performance and consistency. Major bugfixes to undo, sync exchanges.

### Patch Changes

- Updated dependencies [0e11d9b]
  - @lo-fi/common@1.2.0
  - @lo-fi/web@1.2.0

## 2.1.3

### Patch Changes

- Updated dependencies [0e7299e]
  - @lo-fi/common@1.1.4
  - @lo-fi/web@1.1.5

## 2.1.2

### Patch Changes

- d7f2561: hotfix: don't delete indexed fields, only synthetics
- Updated dependencies [d7f2561]
  - @lo-fi/common@1.1.3
  - @lo-fi/web@1.1.4

## 2.1.1

### Patch Changes

- Updated dependencies [617a84c]
  - @lo-fi/common@1.1.2
  - @lo-fi/web@1.1.3

## 2.1.0

### Minor Changes

- 16aeb5b: fix bug crashing hooks if used twice

### Patch Changes

- Updated dependencies [16aeb5b]
  - @lo-fi/web@1.1.2

## 2.0.1

### Patch Changes

- Updated dependencies [03b40f3]
  - @lo-fi/common@1.1.1
  - @lo-fi/web@1.1.1

## 2.0.0

### Patch Changes

- Updated dependencies [f3bd34f]
  - @lo-fi/common@1.1.0
  - @lo-fi/web@1.1.0

## 1.1.2

### Patch Changes

- Updated dependencies [2560a63]
  - @lo-fi/common@1.0.3
  - @lo-fi/web@1.0.6

## 1.1.1

### Patch Changes

- Updated dependencies [d29193f]
  - @lo-fi/common@1.0.2
  - @lo-fi/web@1.0.4

## 1.1.0

### Minor Changes

- dcd5dd9: Use a provider to supply storage client for react hooks

## 1.0.2

### Patch Changes

- Updated dependencies [5f89e31]
  - @lo-fi/common@1.0.1
  - @lo-fi/web@1.0.1

## 1.0.1

### Minor Changes

- 7c87fdd: Undo and redo, more aggressive rebasing

### Patch Changes

- Updated dependencies [7c87fdd]
  - @lo-fi/common@0.4.0
  - @lo-fi/web@0.4.0

## 1.0.0

### Minor Changes

- 5c4a92d: Separate auth into its own endpoint

### Patch Changes

- Updated dependencies [5c4a92d]
  - @lo-fi/web@0.3.0
  - @lo-fi/common@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [7a333aa]
- Updated dependencies [0497ebe]
  - @lo-fi/common@0.2.1
  - @lo-fi/web@0.2.1

## 0.2.0

### Minor Changes

- dd0e3a8: Hybrid push/pull sync for solo clients

### Patch Changes

- Updated dependencies [50f7ca0]
- Updated dependencies [dd0e3a8]
  - @lo-fi/web@0.2.0
  - @lo-fi/common@0.2.0

## 0.1.1

### Patch Changes

- 3f71be4: Added CLI to generate client typings
- Updated dependencies [3f71be4]
  - @lo-fi/common@0.1.1
  - @lo-fi/web@0.1.1

## 0.1.0

### Patch Changes

- 19bc8f2: Added 'any' field type to schema
- 3d2e2e5: support plural name in hooks
- Updated dependencies [19bc8f2]
- Updated dependencies [3d2e2e5]
  - @lo-fi/common@0.1.0
  - @lo-fi/web@0.1.0
