---
'@verdant-web/server': minor
---

New storage options: You can now configure Verdant with `sqlShardStorage`, which stores each library in a different database file. This is swappable with `sqlStorage` using configuration which automatically copies data from the old single database into sharded ones. Additionally, WAL mode is now enabled by default on all SQLite-backed storage options.
