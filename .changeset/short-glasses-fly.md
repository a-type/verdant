---
'@verdant-web/store': minor
'@verdant-web/common': patch
---

Add operation "overlaying," which compresses multiple batched changes to the same field into a single operation before persisting to storage and sync. This preserves the instantaneous nature of immediate changes, while also improving storage and network efficiency by not flushing every instantaneous operation to sync.
