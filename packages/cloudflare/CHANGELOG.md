# @verdant-web/cloudflare

## 0.5.0

### Minor Changes

- a084120: Presence now tracks all recently active replicas for each user (`UserInfo.replicaIds`), so multiple devices for the same user correctly upgrade from polling to WebSockets. The client's `selfReplicaIds` is rebuilt from server data so devices which leave are forgotten, and clients downgrade back to polling when they are alone. Push/pull clients also receive current presence in operation acknowledgements, letting them discover peers as soon as they make changes. Global ack consensus now considers every active replica of a user.

### Patch Changes

- Updated dependencies [a084120]
  - @verdant-web/common@3.3.0
  - @verdant-web/server@4.3.0

## 0.4.6

### Patch Changes

- Updated dependencies [f3c0806]
  - @verdant-web/common@3.2.2
  - @verdant-web/server@4.2.5

## 0.4.5

### Patch Changes

- Updated dependencies [b77c9ab]
  - @verdant-web/common@3.2.1
  - @verdant-web/server@4.2.4

## 0.4.4

### Patch Changes

- c94dbe9: Restore hibernated websocket connections to fix rebroadcasting problem after hibernation
- Updated dependencies [c94dbe9]
  - @verdant-web/server@4.2.3

## 0.4.3

### Patch Changes

- e7021f2: reduce log spam from presence loading
- f3aacef: Tweak presence timings for more robustness
- Updated dependencies [f3aacef]
- Updated dependencies [7549577]
  - @verdant-web/server@4.2.2

## 0.4.2

### Patch Changes

- 2ce8029: Fix bug with message wakeup for hibernation in DO leading to uninitialized library

## 0.4.1

### Patch Changes

- Updated dependencies [8c3ff5d]
  - @verdant-web/common@3.2.0
  - @verdant-web/server@4.2.1

## 0.4.0

### Minor Changes

- 38e3c3a: Support different presence storage backends

### Patch Changes

- Updated dependencies [38e3c3a]
  - @verdant-web/server@4.2.0

## 0.3.1

### Patch Changes

- 73e0e86: make do websocket presence sturdier
- Updated dependencies [73e0e86]
  - @verdant-web/server@4.1.1

## 0.3.0

### Minor Changes

- 0d921de: don't remove webscockets during hibernation

## 0.2.0

### Minor Changes

- c105238: explicit disconnect message, looser presence enforcement in DO

### Patch Changes

- Updated dependencies [c105238]
  - @verdant-web/common@3.1.0
  - @verdant-web/server@4.1.0

## 0.1.8

### Patch Changes

- 5beee50: turn off auto heartbeat response by default

## 0.1.7

### Patch Changes

- 8a1e494: Improvements for DO websocket presence
- Updated dependencies [8a1e494]
  - @verdant-web/server@4.0.4

## 0.1.6

### Patch Changes

- deca7df: Support hosts ending in /

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
