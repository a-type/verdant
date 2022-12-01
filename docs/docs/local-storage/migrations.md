---
sidebar_position: 3
---

# Migrations

Every schema change requires a migration, including the initial one. When you increment your schema version number and run the `lo-fi generate` CLI, it will automatically generate the migration files for you and create a copy of your schema for use in future migrations.

By default this migration is very minimal and possibly incorrect. It iterates over all document collections and refreshes every item. This is sufficient for applying defaults to any new created fields and updating indexes, but will not be enough if you change the shape of your data in a meaningful way.

You can then edit this migration to include transformation of object shapes to coincide with the schema changes, or to initialize default data for new collections, etc.

```ts
// migrations/v1.ts

import { migrate } from '@lo-fi/web';
import v1Schema from '../generatedClient/schemaVersions/v1.js';
import v2Schema from '../generatedClient/schemaVersions/v2.js';

export default migrate(v1Schema, v2Schema, async (tools) => {
	// your migration logic goes here
});
```

## What you can do in a migration

The argument supplied to your function passed to the 2nd/3rd parameter of `migrate` supplies some tools for you to migrate and initialize data.

- `migrate(collectionName, async (old) => updated)`: This takes a collection name and a processor function which receives an old document and returns a new one. You can use this to easily iterate over all existing documents and transform them however you like. You can also run async code in the iterator if you need to lookup information to change the document.
- `withDefaults(collectionName, old)`: This is a helper which can be used to apply default values to a document according to the upcoming schema. Most useful when combined with `migrate` to iterate over all documents and update their defaults.
- `queries`: a kit of queries, namespaced by document collection. These are the same as the queries on the main client, but (currently) lack rich TypeScript hints. Use them like: `const matches = await queries.todos.findAll({ where: 'category', equals: 'code' });`. Instead of a LiveQuery, the result is returned directly (no need for `.resolved`).
- `mutations`: a kit of mutations, namespaced by document collection. These allow you to `put` or `delete` whole documents. In contrast to `mutate`, which only works with existing data, this lets you initialize new default data or remove unwanted data for the new schema.

You can combine these tools with your own asynchronous logic! You can even make HTTP requests to a server to fetch initial data.

However, keep in mind that until migration completes, your client will not be available and your application will be in a loading state.

## Understanding how migrations are run

Unlike centralized server databases, migrations are not done during a set maintenance period or deploy. Any migration you create could be run at any time on anyone's device! **A new user will run all your migrations before they start using the app, no matter when they find it.** This means if a major version change alters the way lo-fi does migrations, you may need to update _all_ your previous migrations to use the new syntax. I will try to avoid that!

It's especially important to understand this new mental model for migrations if you make external requests as part of your migration / data initialization process. If you have a migration that's a year old and depends on an API on your server for data, you must not assume that because it's a year old you can safely remove that API endpoint. New users will still call that migration.

Likewise, if you're using any possibly flaky external data call in your migrations, **you should define an explicit failure behavior.** Do you want to continue on without that data? Or do you want to throw an error, which will crash your application? Since migrations are run first-thing, you want to be careful here! A failing migration will prevent anyone from trying your app for the first time (but existing users will not encounter this, unless they use a new device).

## Supplying migrations to the client

In addition to migration files, a `migrations.ts` file is generated which combines them in an array. This array of migrations (in order of version) must be supplied to the client when generated.

```ts
// migrations/migrations.ts
import v1 from './migrations/v1.js';

export default [v1];
```

```ts
import migrations from './migrations/migrations.js';

const clientDesc = new ClientDescriptor({
	// ... the rest
	migrations,
});
```
