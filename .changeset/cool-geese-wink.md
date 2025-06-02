---
'@verdant-web/store': minor
---

Deleting documents no longer fires change events to avoid processing changes on deleted (empty) data, which application logic is probably not designed for. This should also hopefully fix the redundant initial change events that were fired on newly created entities.
