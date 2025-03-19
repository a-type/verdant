# @verdant-web/s3-file-storage

## 1.0.38

### Patch Changes

- @verdant-web/server@3.3.11

## 1.0.37

### Patch Changes

- @verdant-web/server@3.3.10

## 1.0.36

### Patch Changes

- @verdant-web/server@3.3.9

## 1.0.35

### Patch Changes

- @verdant-web/server@3.3.8

## 1.0.34

### Patch Changes

- @verdant-web/server@3.3.7

## 1.0.33

### Patch Changes

- @verdant-web/server@3.3.6

## 1.0.32

### Patch Changes

- Updated dependencies [4312c3f]
  - @verdant-web/server@3.3.5

## 1.0.31

### Patch Changes

- Updated dependencies [f2511398]
- Updated dependencies [d10665df]
  - @verdant-web/server@3.3.4

## 1.0.31-alpha.2

### Patch Changes

- Updated dependencies [f2511398]
  - @verdant-web/server@3.3.4-alpha.2

## 1.0.31-alpha.1

### Patch Changes

- Updated dependencies [d10665df]
  - @verdant-web/server@3.3.4-alpha.1

## 1.0.31-alpha.0

### Patch Changes

- @verdant-web/server@3.3.4-alpha.0

## 1.0.30

### Patch Changes

- 1787ef97: Official release of refactored persistence layer! This doesn't have much functional impact for users, but some advanced/experimental config settings have changed. Store now requires a recently generated client via CLI; be sure to upgrade CLI and regenerate your client from your schema even if your schema hasn't changed.
- Updated dependencies [423493cf]
- Updated dependencies [1787ef97]
  - @verdant-web/server@3.3.3

## 1.0.30-next.1

### Patch Changes

- @verdant-web/server@3.3.3-next.1

## 1.0.30-next.0

### Patch Changes

- Updated dependencies [423493cf]
  - @verdant-web/server@3.3.3-next.0

## 1.0.29

### Patch Changes

- @verdant-web/server@3.3.2

## 1.0.28

### Patch Changes

- @verdant-web/server@3.3.1

## 1.0.27

### Patch Changes

- Updated dependencies [fe020adb]
  - @verdant-web/server@3.3.0

## 1.0.26

### Patch Changes

- Updated dependencies [4679a9fb]
- Updated dependencies [5882e6dc]
  - @verdant-web/server@3.2.0

## 1.0.26-next.1

### Patch Changes

- @verdant-web/server@3.2.0-next.1

## 1.0.26-next.0

### Patch Changes

- Updated dependencies [5882e6dc]
  - @verdant-web/server@3.2.0-next.0

## 1.0.25

### Patch Changes

- Updated dependencies [d0c8fd5e]
  - @verdant-web/server@3.1.3

## 1.0.24

### Patch Changes

- Updated dependencies [2ec1a25]
  - @verdant-web/server@3.1.2

## 1.0.23

### Patch Changes

- Updated dependencies [1e82d62]
  - @verdant-web/server@3.1.1

## 1.0.22

### Patch Changes

- Updated dependencies [27e7587]
  - @verdant-web/server@3.1.0

## 1.0.21

### Patch Changes

- @verdant-web/server@3.0.5

## 1.0.20

### Patch Changes

- @verdant-web/server@3.0.4

## 1.0.19

### Patch Changes

- @verdant-web/server@3.0.3

## 1.0.18

### Patch Changes

- 1ab35f2: Fix suspicious path joining
  - @verdant-web/server@3.0.2

## 1.0.17

### Patch Changes

- Updated dependencies [2add1d9]
  - @verdant-web/server@3.0.1

## 1.0.16

### Patch Changes

- Updated dependencies [43edd7a]
  - @verdant-web/server@3.0.0

## 1.0.16-next.0

### Patch Changes

- Updated dependencies [43edd7a]
  - @verdant-web/server@3.0.0-next.0

## 1.0.15

### Patch Changes

- Updated dependencies [a99d9a4]
  - @verdant-web/server@2.1.3

## 1.0.14

### Patch Changes

- @verdant-web/server@2.1.2

## 1.0.13

### Patch Changes

- Updated dependencies [cffabae]
  - @verdant-web/server@2.1.1

## 1.0.12

### Patch Changes

- Updated dependencies [3bd652f]
  - @verdant-web/server@2.1.0

## 1.0.11

### Patch Changes

- Updated dependencies [11d2e0a]
  - @verdant-web/server@2.0.8

## 1.0.10

### Patch Changes

- @verdant-web/server@2.0.7

## 1.0.9

### Patch Changes

- Updated dependencies [8b004bd]
  - @verdant-web/server@2.0.6

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
