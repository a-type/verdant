---
'@verdant-web/cli': minor
---

[CLI] Fixed named type generation for File fields; was "string", now "EntityFile." Fixed named type generation for nullable fields; previously named types would include `| null` union, now they only describe the defined shape and the `| null` is properly applied to Init/Destructured parent objects to specify when a null value is allowed or expected. The named types should now be more helpful for describing the actual defined value of the field in question!
