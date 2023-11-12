---
'@verdant-web/store': patch
---

Added an EXPERIMENTAL_weakRefs flag to client initialization which turns on WeakRef usage for all entities in cache. This helps to evict unused entities from memory safely. However, while it passes the full (extensive) Verdant test suite, I still want to test this in real life for a while before making it the default.
