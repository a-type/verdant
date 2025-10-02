---
sidebar_position: 9
---

# Server Persistent Storage

Verdant only supports SQLite-backed server storage at the moment. Each Verdant library is stored as a separate SQLite database.

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

In addition, storage supports the `disableWal` option, which switches off the WAL in SQLite. I don't think you'd want to do that, but, it's there. Remember Verdant makes frequent writes during high traffic periods.

## Database-per-library tradeoff

There are drawbacks to database-per-tenant models, but most of them don't apply to Verdant:

- Migration of database schema requires more coordination: Verdant will handle these for you and they are not likely to happen very often, if at all.
- Having to coordinate which database to query: again, Verdant handles this just fine for you.
- Hard to aggregate query across multiple databases: there's no reason to do this with the kind of data Verdant stores.
- Backups require copying all files: this one's kinda applicable, but backups are also a lot less critical in local-first, since the server can restore from client replicas.
