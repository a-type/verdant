---
'@verdant-web/store': patch
---

An attempt to fix a particularly nasty storage bug where a race condition caused some documents to soft-delete. Their operations were still present in metadata, but the queryable snapshot was written as a deletion because the snapshot writer accessed that metadata before it was ready. I can't guarantee this fixes all issues, but it reliably passes the regression test so far.
