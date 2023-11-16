---
'@verdant-web/server': minor
'@verdant-web/cli': patch
'@verdant-web/store': patch
---

Server: delete empty snapshots and don't store new empty snapshots. This shouldn't have any effect on behavior. Client: fixed a rare bug with initializing a client for the first time. CLI: fixed typings for deletable fields.
