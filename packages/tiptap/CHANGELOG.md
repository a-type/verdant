# @verdant-web/tiptap

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
