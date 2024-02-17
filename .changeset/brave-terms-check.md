---
'@verdant-web/common': minor
'@verdant-web/cli': minor
'@verdant-web/store': minor
---

This release officially removes support for "indexed" applied to individual fields in your schema. Please migrate to use the "indexes" section of the collection definition instead! It also fixes some typing issues with the new field creator functions on schema.fields.
