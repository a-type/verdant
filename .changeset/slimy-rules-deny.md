---
'@verdant-web/store': major
'@verdant-web/cli': minor
'@verdant-web/common': minor
'@verdant-web/create-app': patch
'@verdant-web/s3-file-storage': patch
'@verdant-web/react': patch
'@verdant-web/react-router': patch
'@verdant-web/server': patch
---

Official release of refactored persistence layer! This doesn't have much functional impact for users, but some advanced/experimental config settings have changed. Store now requires a recently generated client via CLI; be sure to upgrade CLI and regenerate your client from your schema even if your schema hasn't changed.
