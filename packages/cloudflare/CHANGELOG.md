# @verdant-web/cloudflare

## 0.1.5

### Patch Changes

- Updated dependencies [ad19b53]
  - @verdant-web/server@4.0.3

## 0.1.4

### Patch Changes

- 6d79912: Refine some server reset sync logic
- Updated dependencies [6d79912]
  - @verdant-web/server@4.0.2

## 0.1.3

### Patch Changes

- 88a8b31: Fix mounting router on nested paths

## 0.1.2

### Patch Changes

- Updated dependencies [71f884f]
  - @verdant-web/server@4.0.1

## 0.1.1

### Patch Changes

- 687b79c: Mark fileStorage as optional

## 0.1.0

### Minor Changes

- 6cfa90d: Complete refactor of server to support more runtimes. This fundamentally changes how Verdant server is constructed and used in Node, and adds a Cloudflare binding.

  ## Breaking changes

  - New, rewritten Node bindings and initialization procedure. See docs.
  - **Removed:** Unified SQL storage. Only sharded SQLite storage is supported.
  - How Node sync servers interact with libraries has changed. See docs.

  ## Internal changes

  These shouldn't affect user code but do require updating client/server in tandem.

  - Heartbeat payload is simplified to just `type`.

  ## New: Cloudflare

  Verdant now has experimental support for Cloudflare stacks, using Durable Objects to represent individual Verdant libraries.

  This always seemed like a good fit, but the effort of refactoring required to adapt to a very different backend architecture meant it's been a long time coming.

  Cloudflare bindings pass the same extensive integration test suite as the original Node bindings, 1:1. This gives some real confidence in stability, but for the time being they remain `0.1` until proven in production.

  ## Other things

  The main integration test suite has been rewritten from JSDOM and now uses Vitest Browser Mode, to provide even more reliability that Verdant works in real browsers. The tests are also faster now!

### Patch Changes

- Updated dependencies [6cfa90d]
  - @verdant-web/common@3.0.0
  - @verdant-web/server@4.0.0
