---
'@verdant-web/cli': major
'@verdant-web/common': minor
'@verdant-web/store': minor
---

Rewrites the CLI to fully evaluate schema code, rather than just parsing it as a Typescript AST.

This allows schemas to import other modules and use any plain TS logic desired to define the final schema.

Schemas are now bundled and compiled to JS before storing historical copies. The primary schema is now just a pointer to its historical version.

Migrations now use the new `createMigration` function universally. Migrations are now generated with typings supplied by compiled historical schemas. This should make migration typings more consistent and reliable.

This change also deprecates fields with `index: true` in favor of a new `indexes` part of a collection schema, which allows direct field pass-through indexes. This consolidates indexes in one place (or, two, with compounds...) and generally makes the typing simpler.

Deleted a lot of extraneous TS typings.

Store now only writes index values as top-level fields in the object written to IndexedDB. A snapshot of the object is still provided in a sub-key for future use. This should not be a noticeable change; Verdant had already phased out using the snapshot value in favor of regenerating the view from operations on first load of a document.
