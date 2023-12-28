---
'@verdant-web/common': major
'@verdant-web/server': major
'@verdant-web/store': major
'@verdant-web/react': minor
'@verdant-web/cli': minor
'@verdant-web/s3-file-storage': patch
'@verdant-web/react-router': patch
'@verdant-web/create-app': patch
---

# Summary

Major rewrite of internals for document storage to improve memory efficiency and data consistency. Introduces "pruning" and more advanced document validation.

## Breaking changes

- Supplying invalid data to documents (according to the schema) is no longer ignored and throws an error.
- Documents with data which doesn't conform to schema now "prune" invalid data up to the nearest nullable parent or array/map collection. If no prune point is found, the entire document is unavailable.
- Removed `client.entities.flushPatches`; use `client.entities.flushAllBatches` instead to write all pending changes to storage and sync.

## Ambiguous changes

- `changeDeep` event on documents now fires before `change`
- Document entities will be garbage collected more reliably now. Storing references to entities outside of a query is not recommended. This behavior requires the `EXPERIMENTAL_weakRefs` flag to be provided to the client initializer.
