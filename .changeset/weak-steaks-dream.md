---
'@verdant-web/common': minor
'@verdant-web/server': minor
'@verdant-web/store': minor
'@verdant-web/cli': minor
---

Introduces document access control. It's now possible to mark specific documents as 'private,' which restricts access of these documents to only the current user's devices in sync scenarios. Access controls have no effect on local-only databases, but are still advised for use since these libraries might sync someday in the future. See the docs for information on how to assign access control and caveats about usage.
