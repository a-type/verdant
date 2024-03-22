---
'@verdant-web/server': major
'@verdant-web/common': minor
'@verdant-web/store': minor
---

Introduces support for custom server storage solutions via interface implementation. This change also makes server storage queries and writes async (they weren't before), which improves compatibility with custom solutions and performance overall with high message concurrency.
