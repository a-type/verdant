---
'@verdant-web/server': patch
'@verdant-web/store': patch
---

Server: fixed bug with demo server loading files with spaces in filenames. Store: Fixed a bug which caused files not immediately uploaded to end up on the server with a filename "blob" instead of the original filename.
