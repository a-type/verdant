# @verdant-web/react-router

## 0.6.4

### Patch Changes

- fe020adb: Add "internal" presence concepts which use presence machinery to power built-in features. Starting with "view ID" which encodes the 'view' the user is looking at, further refining presence peer relationships for apps with multiple distinct views. This version also adds a cleanup callback to the router's route onVisited callback.

## 0.6.3

### Patch Changes

- 8ac7517: Add preserveQuery option to useNavigate, like Link

## 0.6.2

### Patch Changes

- b9bfda3: Add AutoRestoreScroll experimental component

## 0.6.1

### Patch Changes

- 61f77a6: Export a few types for the router

## 0.6.0

### Minor Changes

- 0603aa4: Fix various router problems. Router onNavigate now accepts full location as first parameter (breaking change). Fixed links going to stale locations if to prop changed. Fix scroll resetting on search param change. Fixed scroll jumping to 0 during a suspense route transition.

## 0.5.5

### Patch Changes

- ba63e80: # Summary

  Major rewrite of internals for document storage to improve memory efficiency and data consistency. Introduces "pruning" and more advanced document validation.

  ## Breaking changes

  - Supplying invalid data to documents (according to the schema) is no longer ignored and throws an error.
  - Documents with data which doesn't conform to schema now "prune" invalid data up to the nearest nullable parent or array/map collection. If no prune point is found, the entire document is unavailable.
  - Removed `client.entities.flushPatches`; use `client.entities.flushAllBatches` instead to write all pending changes to storage and sync.

  ## Ambiguous changes

  - `changeDeep` event on documents now fires before `change`
  - Document entities will be garbage collected more reliably now. Storing references to entities outside of a query is not recommended. This behavior requires the `EXPERIMENTAL_weakRefs` flag to be provided to the client initializer.

## 0.5.5-next.0

### Patch Changes

- Major rewrite of internals for document storage to improve memory efficiency and data consistency. Introduces "pruning."

## 0.5.4

### Patch Changes

- aaa186f: Added data-active-exact parameter to Links

## 0.5.3

### Patch Changes

- 86f1a42: Add rendering override for Outlet, docs for hooks

## 0.5.2

### Patch Changes

- 9a731e4: Scroll restoration now restores to [0,0] explicitly on first-time route visits. A second parameter will indicate if this is the first visit for custom behavior.

## 0.5.1

### Patch Changes

- 186d7e6: Allow skipping top level routes in RouteTree

## 0.5.0

### Minor Changes

- 0293316: Rename RouteByPath to Route. Add RouteTree. Fix params being local level only.

## 0.4.1

### Patch Changes

- cfa0692: Expose missing scroll restoration hook

## 0.4.0

### Minor Changes

- 32592a8: Added scroll restoration tools

## 0.3.1

### Patch Changes

- b4a4803: Fix more path resolution errors

## 0.3.0

### Minor Changes

- 2494e71: Breaking change to router: [perf] remove onAccessible callback in routes

  This feature was simply bad for performance and scalability as the number of routes grew, since each Link had to traverse the entire route tree on mount. This created an exponential slowdown between number of links on the page and number of routes.

  If you want to preload data for routes the user may visit from the current page, use `onVisited` on that page and your own judgment on what to preload.

### Patch Changes

- b2a9fcd: Fix useMatch

## 0.2.5

### Patch Changes

- 9ab6d86: Fix absolute paths for RouteByPath

## 0.2.4

### Patch Changes

- c2c64a5: Fix more errors with RouteByPath

## 0.2.3

### Patch Changes

- 85920e1: Resolve relative paths in RouteByPath

## 0.2.2

### Patch Changes

- c177778: Fix params on useNextMatchingRoute to incorporate parent route params

## 0.2.1

### Patch Changes

- 2bd2c98: Add arbitrary data to routes

## 0.2.0

### Minor Changes

- f081d74: Add tools for route transition animations, like manual control of rendering routes even if they don't match the path

## 0.1.6

### Patch Changes

- 1dafc21: Add built-in preserve query prop to Link

## 0.1.5

### Patch Changes

- 53d0c1e: add hook to get currently matching routes
- db43f41: Rename framework to "Verdant"

## 0.1.4

### Patch Changes

- a5409a9: Fix some structural mistakes

## 0.1.3

### Patch Changes

- 5aefdbe: Support modifying old search params

## 0.1.2

### Patch Changes

- ce84f5f: Support nested params

## 0.1.1

### Patch Changes

- a947246: Initial release of router
