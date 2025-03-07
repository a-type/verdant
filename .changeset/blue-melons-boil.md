---
'@verdant-web/common': minor
'@verdant-web/tiptap': minor
'@verdant-web/store': minor
---

Major but non-breaking changes to the diffing algorithm. Some undefined behaviors may be different when using `.update`, or during collection migrations. But all of those behaviors were bad or confusing before, and now they make a little more sense.

# Store changes

You can now use the `getEntityClient` exported function to retrieve the Client instance which owns any Verdant entity. I don't necessarily recommend using this much, but you might find it convenient as an alternative to `useClient`.

# TipTap changes

This version also fixes the TipTap integration's Undo behavior when deleting nodes, which previously caused invalid data. It changes the approach of the library by exposing a TipTap Extension for Verdant integration instead of relying on React.

This integration also now allows you to switch between TipTap or Verdant's undo tracking as you see fit.

See [docs](https://verdant.dev/docs/integrations/tiptap)
