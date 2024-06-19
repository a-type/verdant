# @lo-fi/react

## 34.0.0

### Patch Changes

- Updated dependencies [c9a0183]
  - @verdant-web/store@3.8.0
  - @verdant-web/common@2.3.3

## 33.0.0

### Minor Changes

- c2a3c78: Fixed some big performance gaps in React hooks - query hooks no longer refresh queries on each render! Also dramatically reduced the number of times a query emits 'change' events to match only changes in the identities of returned documents, as designed, by fixing a mistake in change notification logic. Combined, these drastically improve performance in apps with frequent or real-time changes!

### Patch Changes

- Updated dependencies [e202bdd]
- Updated dependencies [c2a3c78]
- Updated dependencies [91a6a64]
  - @verdant-web/store@3.7.0
  - @verdant-web/common@2.3.2

## 32.0.0

### Major Changes

- c701cfd: Add React hook "useOnChange" (fires a callback on entity changes). Add "deep" option to React hook "useWatch" to watch for deep changes. Remove the "field" variant of "useWatch." CLI must be updated to correctly generate new React hook types.

### Patch Changes

- Updated dependencies [c701cfd]
  - @verdant-web/store@3.6.3

## 31.0.0

### Patch Changes

- Updated dependencies [1ab35f2]
- Updated dependencies [848c1c2]
  - @verdant-web/common@2.3.1
  - @verdant-web/store@3.6.0

## 30.0.0

### Patch Changes

- Updated dependencies [e7598d2]
  - @verdant-web/store@3.5.0

## 29.0.0

### Patch Changes

- Updated dependencies [43edd7a]
  - @verdant-web/common@2.3.0
  - @verdant-web/store@3.4.0

## 29.0.0-next.0

### Patch Changes

- Updated dependencies [43edd7a]
  - @verdant-web/common@2.3.0-next.0
  - @verdant-web/store@3.4.0-next.0

## 28.0.1

### Patch Changes

- 9d7caba: Allow overriding context for react hooks

## 28.0.0

### Patch Changes

- Updated dependencies [6b7b123]
- Updated dependencies [5fef280]
  - @verdant-web/store@3.3.0

## 27.0.0

### Patch Changes

- Updated dependencies [4077465]
  - @verdant-web/common@2.2.0
  - @verdant-web/store@3.2.0

## 26.0.1

### Patch Changes

- Updated dependencies [e4f0720]
  - @verdant-web/common@2.1.1
  - @verdant-web/store@3.1.1

## 26.0.0

### Patch Changes

- Updated dependencies [e0b2a02]
  - @verdant-web/store@3.1.0

## 25.0.4

### Patch Changes

- Updated dependencies [8b004bd]
  - @verdant-web/common@2.1.0
  - @verdant-web/store@3.0.7

## 25.0.3

### Patch Changes

- Updated dependencies [4b9e3e4]
  - @verdant-web/common@2.0.3
  - @verdant-web/store@3.0.5

## 25.0.2

### Patch Changes

- Updated dependencies [5aa6531]
  - @verdant-web/common@2.0.2
  - @verdant-web/store@3.0.4

## 25.0.1

### Patch Changes

- Updated dependencies [d2bbec4]
  - @verdant-web/common@2.0.1
  - @verdant-web/store@3.0.2

## 25.0.0

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

### Patch Changes

- Updated dependencies [ba63e80]
  - @verdant-web/common@2.0.0
  - @verdant-web/store@3.0.0

## 25.0.0-next.0

### Minor Changes

- Major rewrite of internals for document storage to improve memory efficiency and data consistency. Introduces "pruning."

### Patch Changes

- Updated dependencies
  - @verdant-web/common@2.0.0-next.0
  - @verdant-web/store@3.0.0-next.0

## 24.0.2

### Patch Changes

- Updated dependencies [5a5a312]
  - @verdant-web/common@1.16.2
  - @verdant-web/store@2.8.5

## 24.0.1

### Patch Changes

- Updated dependencies [56cee57]
  - @verdant-web/common@1.16.1
  - @verdant-web/store@2.8.3

## 24.0.0

### Patch Changes

- Updated dependencies [594a03c]
- Updated dependencies [e96b252]
  - @verdant-web/common@1.16.0
  - @verdant-web/store@2.8.0

## 23.0.5

### Patch Changes

- Updated dependencies [c686e0f]
  - @verdant-web/common@1.15.5
  - @verdant-web/store@2.7.10

## 23.0.4

### Patch Changes

- Updated dependencies [7b3e213]
  - @verdant-web/common@1.15.4
  - @verdant-web/store@2.7.8

## 23.0.3

### Patch Changes

- Updated dependencies [b0c78bf]
  - @verdant-web/common@1.15.3
  - @verdant-web/store@2.7.7

## 23.0.3-next.0

### Patch Changes

- Updated dependencies [b0c78bf2]
  - @verdant-web/common@1.15.3-next.0
  - @verdant-web/store@2.7.7-next.0

## 23.0.2

### Patch Changes

- Updated dependencies [633bb00]
  - @verdant-web/common@1.15.2
  - @verdant-web/store@2.7.2

## 23.0.1

### Patch Changes

- Updated dependencies [f847ec1]
  - @verdant-web/common@1.15.1
  - @verdant-web/store@2.7.1

## 23.0.0

### Minor Changes

- 64e411b: Updated how plural names are used in collections. If you've named your collection keys as the plural, this won't affect you. However, if your collections were keyed by something that didn't match with your plural name, the names of the keys you use to access queries and of your generated React hooks will change.

  To migrate, remove all `pluralName` usage in your schema, and assign your collections to the plural name of your model in the `collections` part of your schema.

### Patch Changes

- Updated dependencies [64e411b]
- Updated dependencies [e6ac22a]
- Updated dependencies [ab178e2]
- Updated dependencies [a73d381]
- Updated dependencies [6dab424]
  - @verdant-web/store@2.7.0
  - @verdant-web/common@1.15.0

## 22.0.0

### Patch Changes

- Updated dependencies [3b2ee59]
- Updated dependencies [81ca170]
  - @verdant-web/store@2.6.0
  - @verdant-web/common@1.14.1

## 21.1.2

### Patch Changes

- 9cd36d1: Fix default suspense behavior on paginated hooks

## 21.1.1

### Patch Changes

- 2b70030: Fix empty state for unsuspended all hook

## 21.1.0

### Minor Changes

- a3cd86c: Add unsuspended React hook variants

## 21.0.2

### Patch Changes

- Updated dependencies [e2fe2aa]
  - @verdant-web/common@1.14.0
  - @verdant-web/store@2.5.6

## 21.0.1

### Patch Changes

- a989af4: Query.subscribe now supports specifying event to subscribe to. Former use is deprecated but still available. React paginated query hooks now supply a status parameter to check query re-validation.
- Updated dependencies [a989af4]
- Updated dependencies [a989af4]
  - @verdant-web/store@2.5.5

## 21.0.0

### Major Changes

- 17f66ca: Provider no longer has an internal suspense boundary. You must wrap your Provider in your own Suspense. This gives you more control over loading behavior at the cost of a slight initial bump of having to understand Suspense, which the React Verdant bindings kind of require anyway.

## 20.0.3

### Patch Changes

- feb503e: Better state tracking for queries and react hooks
- Updated dependencies [feb503e]
  - @verdant-web/store@2.5.2

## 20.0.2

### Patch Changes

- fae9af2: Attempted fix for list queries showing up empty initially

## 20.0.1

### Patch Changes

- 589ae62: wrap invalid state update promise in effect

## 20.0.0

### Patch Changes

- Updated dependencies [52d0c0c]
  - @verdant-web/store@2.5.0

## 19.0.1

### Patch Changes

- Updated dependencies [fd55c1b]
  - @verdant-web/common@1.13.4
  - @verdant-web/store@2.4.1

## 19.0.0

### Patch Changes

- Updated dependencies [1429bfb]
  - @verdant-web/store@2.4.0
  - @verdant-web/common@1.13.3

## 18.0.2

### Patch Changes

- Updated dependencies [9f2d7f2]
  - @verdant-web/common@1.13.2
  - @verdant-web/store@2.3.2

## 18.0.1

### Patch Changes

- Updated dependencies [ed6cda6]
- Updated dependencies [6075f8d]
- Updated dependencies [8d32085]
- Updated dependencies [509917c]
- Updated dependencies [9edb078]
  - @verdant-web/store@2.3.1
  - @verdant-web/common@1.13.1

## 18.0.0

### Patch Changes

- Updated dependencies [a8c8c09]
  - @verdant-web/store@2.3.0
  - @verdant-web/common@1.13.0

## 17.0.0

### Patch Changes

- Updated dependencies [c243009]
  - @verdant-web/common@1.12.0
  - @verdant-web/store@2.2.0

## 16.0.1

### Patch Changes

- b044e75: Fix bug with presence hook, typing on mutation hooks

## 16.0.0

### Patch Changes

- Updated dependencies [a1278d9]
- Updated dependencies [9c9a288]
  - @verdant-web/store@2.1.0

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
