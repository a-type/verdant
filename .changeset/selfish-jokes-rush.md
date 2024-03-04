---
'@verdant-web/store': minor
---

# Support for full export/import of client data

`Client.export` now returns an object with the full operation history, and now also data for all files and the downloaded files themselves.

This can be used to create a backup ZIP file with the new `@verdant-web/store/backup` export. This is exported separately so that applications which don't need this functionality can reduce bundle size, as it comes with a full ZIP implementation.

`Client.import` accepts the exact data that `Client.export` produces, allowing you to transfer data from one client to another. As a convenience for resolving disasters, `Client.__dangerous__hardReset` has been added, which exports and imports in-place, completely rewriting all local data. This may resolve issues in the wild with local database corruption should that happen again (God forbid).
