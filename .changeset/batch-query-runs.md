---
'@verdant-web/store': patch
---

Batch query execution starts to yield to the event loop when many queries run at once, and debounce repeated query revalidation during bursts of incoming changes.
