---
'@verdant-web/cli': major
'@verdant-web/store': minor
'@verdant-web/common': patch
---

**Major CLI changes**:

- The CLI now supports BETA WIP schema workflows. WIP schemas allow you to iterate on schema design locally more easily by copying your database into a temporary branch while you tune the new schema and automatically resetting it when the schema changes.
- A new CLI command has been added: `verdant-preflight`. Include this in your CI to validate that the current schema is not WIP and ready for deployment before merging and deploying your app. Deploying a WIP schema can cause major problems for users, including data loss.
- _Migration:_ CLI usage hasn't changed too much, but the workflow has. You'll see when you run it. It's more interactive now; no need to pass additional flags like `--force`.

Store changes:

- Store now supports WIP schemas. Supplying a schema with `wip: true` to the StoreDescriptor will initialize a Store with the WIP schema and copy all data from the main databases into temporary fork databases for that schema. You can then test your app with the schema changes before committing to a particular schema shape.
- WIP schema usage disables sync! This prevents ephemeral data from being stored on the server or passed to other clients. Commit your WIP schema changes into a production schema to re-enable sync.
