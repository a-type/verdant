---
sidebar_position: 9
---

# Server Persistent Storage

Verdant only supports SQLite-backed server storage at the moment, but in two flavors:

- Unified: writes to a single database file. Stable and well-tested, but doesn't scale to many libraries at once.
- Sharded: writes one database file per library. Still experimental and being vetted as of writing. Should scale better to large apps.

You import the type of storage you want from `@verdant-web/server/storage` and pass it to the `storage` parameter of the `Server` constructor options.

```ts
import { Server } from '@verdant-web/server';
import { sqlStorage, sqlShardStorage } from '@verdant-web/server/storage';

const serverUnified = new Server({
	// ...
	storage: sqlStorage({ databaseFile: 'verdant.sqlite' }),
});

const serverSharded = new Server({
	// ...
	storage: sqlShardStorage({
		databasesDirectory: 'verdant-databases',
		// you can transfer from a previous unified database...
		transferFromUnifiedDatabaseFile: 'verdant.sqlite',
	}),
});
```

Sharded storage supports automatic transfer from a prior unified database on startup, but it's not guaranteed to be fast. It should only happen once, though.

In addition, both storage types support the `disableWal` option, which switches off the WAL in SQLite. I don't think you'd want to do that, but, it's there. Remember Verdant makes frequent writes during high traffic periods.

## Tradeoffs

Most likely, once sharded storage is proven stable, you'll want to use that.

There are drawbacks to database-per-tenant models, but most of them don't apply to Verdant:

- Migration of database schema requires more coordination: Verdant will handle these for you and they are not likely to happen very often, if at all.
- Having to coordinate which database to query: again, Verdant handles this just fine for you.
- Hard to aggregate query across multiple databases: there's no reason to do this with the kind of data Verdant stores.
- Backups require copying all files: this one's kinda applicable, but backups are also a lot less critical in local-first, since the server can restore from client replicas.

There's one more tradeoff, which is cold start time for initial sync on a library. When a new replica for a library sends a message to the server, it will open the sharded database for that library if it's not already loaded. This can take up to a couple hundred milliseconds in my testing. I do not believe it should take longer for larger databases, but I'm still getting an idea of it.

Either way, database connections are kept alive for a while after cold start (default: 1 hour). So this is a one-time initial sync cost.
