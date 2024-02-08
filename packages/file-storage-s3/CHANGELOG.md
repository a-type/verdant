# @verdant-web/s3-file-storage

## 1.0.8

### Patch Changes

- @verdant-web/server@2.0.5

## 1.0.7

### Patch Changes

- Updated dependencies [5aa6531]
  - @verdant-web/server@2.0.4

## 1.0.6

### Patch Changes

- Updated dependencies [7bc2ca3]
  - @verdant-web/server@2.0.3

## 1.0.5

### Patch Changes

- Updated dependencies [d1f7e46]
  - @verdant-web/server@2.0.2

## 1.0.4

### Patch Changes

- Updated dependencies [d2bbec4]
  - @verdant-web/server@2.0.1

## 1.0.3

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

- Updated dependencies [ba63e80]
  - @verdant-web/server@2.0.0

## 1.0.3-next.0

### Patch Changes

- Major rewrite of internals for document storage to improve memory efficiency and data consistency. Introduces "pruning."
- Updated dependencies
  - @verdant-web/server@2.0.0-next.0

## 1.0.2

### Patch Changes

- @verdant-web/server@1.9.4

## 1.0.1

### Patch Changes

- @verdant-web/server@1.9.3