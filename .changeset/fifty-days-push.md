---
'@verdant-web/store': patch
---

Fix bug where files would be repeatedly reuploaded by new replicas. File snapshots now reliably include the uploaded URL instead of the local one after a file has settled.
