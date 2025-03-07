---
'@verdant-web/common': minor
'@verdant-web/tiptap': minor
'@verdant-web/store': minor
---

Major but non-breaking changes to the diffing algorithm. Some undefined behaviors may be different when using .update, or during collection migrations. But all of those behaviors were bad or confusing before, and now they make a little more sense. This version also fixes the TipTap integration's Undo behavior when deleting nodes, which previously caused invalid data.
