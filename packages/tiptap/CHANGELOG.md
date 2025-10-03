# @verdant-web/tiptap

## 6.0.0

### Patch Changes

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

- Updated dependencies [6cfa90d]
  - @verdant-web/common@3.0.0
  - @verdant-web/store@4.6.0
  - @verdant-web/react@42.1.1

## 5.0.2

### Patch Changes

- Updated dependencies [d59c730]
  - @verdant-web/store@4.5.2
  - @verdant-web/react@42.1.0

## 5.0.1

### Patch Changes

- Updated dependencies [6479573]
  - @verdant-web/store@4.5.1
  - @verdant-web/react@42.1.0

## 5.0.0

### Patch Changes

- Updated dependencies [fb75036]
  - @verdant-web/store@4.5.0
  - @verdant-web/react@42.1.0

## 4.1.2

### Patch Changes

- Updated dependencies [36ac749]
  - @verdant-web/store@4.4.2
  - @verdant-web/react@42.1.0

## 4.1.1

### Patch Changes

- 4b7966f: Export media renderer extension in server entry, separate it out

## 4.1.0

### Minor Changes

- 9053db9: TipTap: tools for server-rendering documents with embedded files

## 4.0.0

### Patch Changes

- 31ea7e5: Store: improve error behavior for failed sync. TipTap: fix editor not refreshing when source entities change.
- Updated dependencies [17e1f20]
- Updated dependencies [31ea7e5]
  - @verdant-web/react@42.1.0
  - @verdant-web/store@4.4.1

## 3.0.0

### Patch Changes

- Updated dependencies [f0254d4]
  - @verdant-web/store@4.4.0
  - @verdant-web/common@2.9.1
  - @verdant-web/react@42.0.1

## 2.1.1

### Patch Changes

- 430f487: Adjust typing of files map

## 2.1.0

### Minor Changes

- 88f7d89: Adds experimental support for seamless file uploads in TipTap

## 2.0.0

### Patch Changes

- f2193b5: Lots of bug fixes for diffing lists, manipulating pruned (invalid) data, and reducing patch sizes for moving items in lists and other diffs.
- Updated dependencies [f2193b5]
  - @verdant-web/common@2.9.0
  - @verdant-web/store@4.3.0
  - @verdant-web/react@42.0.0

## 1.0.1

### Patch Changes

- baaeae0: Bugfix: properly initialize tiptap editor from existing doc

## 1.0.0

### Minor Changes

- c793e54: Major but non-breaking changes to the diffing algorithm. Some undefined behaviors may be different when using `.update`, or during collection migrations. But all of those behaviors were bad or confusing before, and now they make a little more sense.

  # Store changes

  You can now use the `getEntityClient` exported function to retrieve the Client instance which owns any Verdant entity. I don't necessarily recommend using this much, but you might find it convenient as an alternative to `useClient`.

  # TipTap changes

  This version also fixes the TipTap integration's Undo behavior when deleting nodes, which previously caused invalid data. It changes the approach of the library by exposing a TipTap Extension for Verdant integration instead of relying on React.

  This integration also now allows you to switch between TipTap or Verdant's undo tracking as you see fit.

  See [docs](https://verdant.dev/docs/integrations/tiptap)

### Patch Changes

- Updated dependencies [c793e54]
  - @verdant-web/common@2.8.0
  - @verdant-web/store@4.2.0
  - @verdant-web/react@41.0.0

## 0.1.6

### Patch Changes

- 35cd259: Make node ID plugin safer

## 0.1.5

### Patch Changes

- a489ddb: Remove editor dependency default

## 0.1.4

### Patch Changes

- 7481df8: Remove another stray log

## 0.1.3

### Patch Changes

- Updated dependencies [005cf3d]
  - @verdant-web/common@2.7.3
  - @verdant-web/react@40.2.4
  - @verdant-web/store@4.1.6

## 0.1.2

### Patch Changes

- fcf4f31: Remove logs from plugin

## 0.1.1

### Patch Changes

- Updated dependencies [8466924]
  - @verdant-web/common@2.7.2
  - @verdant-web/react@40.2.3
  - @verdant-web/store@4.1.5
