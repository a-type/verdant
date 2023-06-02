---
sidebar_position: 3
---

# Migrations

Every schema change requires a migration, including the initial one. When you increment your schema version number and run the `Verdant generate` CLI, it will automatically generate the migration files for you and create a copy of your schema for use in future migrations.

By default this migration is very minimal and possibly incorrect. It iterates over all document collections and refreshes every item. This is sufficient for applying defaults to any new created fields and updating indexes, but will not be enough if you change the shape of your data in a meaningful way.

You can then edit this migration to include transformation of object shapes to coincide with the schema changes, or to initialize default data for new collections, etc.

```ts
// migrations/v1.ts

import { migrate } from '@verdant-web/store';
import v1Schema from '../generatedClient/schemaVersions/v1.js';
import v2Schema from '../generatedClient/schemaVersions/v2.js';

export default migrate(v1Schema, v2Schema, async (tools) => {
	// your migration logic goes here
});
```

## Automatic migrations

If no migration procedure is supplied (i.e. the migration is empty), all collections which had minor changes will receive an automatic upgrade. This can save you some trouble. Automatic migrations support the following changes:

- Adding a new index
- Changing an existing index
- Removing an existing index
- Adding a new default value
- Removing fields or sub-fields

If your schema changes consist only of these kinds of modifications, you don't need to modify the generated migration!

## What you can do in a migration

The argument supplied to your function passed to the 2nd/3rd parameter of `migrate` supplies some tools for you to migrate and initialize data.

- `migrate(collectionName, async (old) => updated)`: This takes a collection name and a processor function which receives an old document and returns a new one. You can use this to easily iterate over all existing documents and transform them however you like. You can also run async code in the iterator if you need to lookup information to change the document. In addition to your supplied modifications, each document processed by `migrate` will have [automatic migrations](#automatic&20migrations) applied.
- `queries`: a kit of queries, namespaced by document collection. These are the same as the queries on the main client, but (currently) lack rich TypeScript hints. Use them like: `const matches = await queries.todos.findAll({ where: 'category', equals: 'code' });`. Instead of a LiveQuery, the result is returned directly (no need for `.resolved`).
- `mutations`: a kit of mutations, namespaced by document collection. These allow you to `put` or `delete` whole documents. In contrast to `mutate`, which only works with existing data, this lets you initialize new default data or remove unwanted data for the new schema.

You can combine these tools with your own asynchronous logic! You can even make HTTP requests to a server to fetch initial data.

However, keep in mind that until migration completes, your client will not be available and your application will be in a loading state.

## Understanding how migrations are run

Unlike centralized server databases, migrations are not done during a set maintenance period or deploy. Any migration you create could be run at any time on anyone's device! **A new user will run all your migrations before they start using the app, no matter when they find it.** This means if a major version change alters the way Verdant does migrations, you may need to update _all_ your previous migrations to use the new syntax. I will try to avoid that!

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

## Migration shortcuts

As your app ages, you'll probably write more migrations than you anticipated. The app I created Verdant for, Gnocchi, is up to version 34 of its schema at time of writing, and it's not even a year old.

This presents a problem: since we need to reconstruct the full version history to correctly resolve the historical migration changes, new users of the app have to run 34 migrations before they can get started! This can take a noticeable amount of time even though there is no actual data being migrated.

> **Why do we need to run all migrations? Why can't you just start from the latest schema?** This is a consequence of how powerful I opted to make migrations in Verdant. In particular I wanted migrations to encapsulate the idea of seeding the database as well. In Gnocchi I seed the default grocery categories in the first migration. If I skipped it, those categories wouldn't exist.
> This is a choice I made, perhaps you won't find the tradeoff worthwhile. But I think the compromise outlined in this section is sufficiently effective at mitigating the problems that the benefits are worth it.

To circumvent having to apply every migration, you can define a "shortcut" migration which covers multiple version changes. For example, you can continuously update a shortcut migration from v1 to vCurrent for new users while maintaining all your existing migrations for previous users, basically the best of both worlds.

However, you must do this carefully to have consistent experiences across all users. Particularly, if you seed data into the database or perform any side-effects (which is not recommended anyway), you'll need to replicate those in your shortcut migration for any migrations you skip over.

Define a shortcut migration by supplying a `from` and `to` schema that are more than one version apart. Everything else is exactly the same. Verdant will take care of planning the most efficient route from the client's current version to the latest version using all of the migrations you supply.

### Deleting old migrations

Suppose you're confident nobody is using versions 1-10 of your schema anymore (be sure to actually measure this!). There's no use keeping those migrations in the codebase! If you're feeling some maintenance burden, or client code bundle size pain, you may wish to remove those old migrations and schemas.

This can be done, but you should be careful. Define a shortcut migration and only specify your new 'minimum schema':

```ts
import { migrate } from '@verdant-web/store';
import v11Schema from './schema-history/v11.js';

export default migrate(v11Schema, async ({ migrate }) => {
	// write your shortcut logic here
});
```

Any data you want to seed should be in the shape of your target schema. If you have no seed data, the above is pretty much all you need.

#### Handling failures

If you delete a migration, there's always a chance someone was on the version that needed it. For example, imagine you did the skip over 1-10 above, but one user was still on v6. If this happens, that user will not be able to initialize a Verdant client, and the app will hard crash on startup.

You should probably handle this case just to be safe. Catch any errors from `ClientDescriptor.open` when you initialize your client. If a `MigrationPathError` is thrown, that indicates that no valid path from the client's version to the latest version was found in your migrations.

```ts
try {
	const client = await clientDescriptor.open();
} catch (err) {
	// I recommend using .name instead of instanceof because of
	// module bundling pitfalls.
	if (err.name === 'MigrationPathError') {
		// time to figure out what to do.
	}
}
```

There are a few options here: you could display an error screen and ask the user to contact you. From there you could push a code update which restores the necessary migrations for the user or create a new shortcut from their version to the latest.

Or, you could throw away the user's local storage. This is a bad experience if the user isn't utilizing sync (they just lose all their data). But if they are syncing, they may not even notice, since new data will populate automatically on reconnection to the server.

```ts
if (err.name === 'MigrationPathError') {
	// this will delete local storage contents
	clientDescriptor.__dangerous__resetLocal();
}
```
