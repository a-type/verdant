---
'@verdant-web/store': minor
'@verdant-web/common': patch
---

Putting a new document now ignores keys not included in the schema. Putting a new document also now properly validates incoming data against the schema and errors on data of the wrong type.
