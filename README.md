# lofi

An IndexedDB-powered database and data sync solution for lightweight, local-first web apps.

- Uses IndexedDB, already built into your browser (no special WASM stuff to set up)
- One small, generic syncing server is all you need
- Schema-based data migrations that can handle offline clients
- Bring your existing authentication
- Realtime multiplayer with (basic) conflict resolution and presence
- Typescript validation based on your schema
- Advanced index and querying tools built in (advanced for IndexedDB, anyway - we're not talking SQL)
- Reactive data queries
- Automatic history compaction

## Early software

This is a very experimental set of libraries which I'm developing slowly alongside my app [Aglio](https://aglio.gfor.rest) to suit my [own goals](https://blog.gfor.rest/blog/lofi-intro). The usage and behavior is subject to change, although I will either try to avoid changes that fundamentally change how data is stored, or provide upgrade paths which won't disrupt apps already in use as much as possible.

Documentation will be sparse for a while. If you'd like to see a full-sized example, [Aglio is open source.](https://github.com/a-type/aglio)

Here's a rough list of things which may change in the near future:

- I might pivot to code-generation based on a schema file instead of runtime-defined schema with complex TypeScript types
- I'll probably drop in a new reactive queries and documents solution, as my current proxy-based one can be a little confusing

## Usage

### Server

The server can be run standalone, or plugged into an existing HTTP server. It requires a few things to be constructed:

- A path to a SQLite database to store data
- An authorization function which it uses to determine connected client identity and library access
- Optional: an interface implementation to provide more detailed user profile information for presence features

Create a server like this:

```ts
import { Server } from '@lofi-db/server';

const server = new Server({
	databaseFile: 'path/to/db.sqlite',
	authorize: (req: IncomingMessage) => {
		// here you may, for example, lookup a cookie on the request to log the user in.

		// below is an idea for anonymous access: the client connects to
		// /lofi/<library ID> and gets a randomly assigned userId.
		const libraryId = req.url.replace('/lofi/', '');
		return {
			libraryId,
			userId: uuid(),
		};
	},
	// below fields are optional
	profiles: {
		get: async (userId: string) => {
			// you could fetch a profile record from a database here to augment
			// this profile with name, image, etc.
			// values will be cached, so don't worry too much about timing.
			return { id: userId };
		},
	},
	// supposing you're using Express or another server already,
	// you can attach lofi to it instead of running it separately.
	httpServer: myExistingServer,
});

// if you did not provide your own http server, call listen to begin
// serving requests
server.listen(8080, () => {
	console.log('Ready!');
});
```

### Client

#### Creating a schema

The first step client-side is to define a schema of what kind of documents you are working with. A schema looks like this:

```ts
import { collection, schema, createDefaultMigration } from '@lofi-db/web';

const todoItemCollection = collection({
	name: 'todoItem',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
			indexed: true,
			unique: true,
		},
		details: {
			type: 'string',
			indexed: false,
			unique: false,
		},
		done: {
			type: 'boolean',
		},
	},
	synthetics: {},
	compounds: {},
});

export const v1Schema = schema({
	version: 1,
	collections: {
		todoItems: todoItemCollection,
	},
});

export const migration = createDefaultMigration(v1Schema);
```

This schema creates 1 document type, `todoItem`, and defines some fields. It also creates the initial default migration to set up this schema in IndexedDB.

The TypeScript types for `collection` should enforce proper schema shape. Note that the `boolean` field type, which is not indexable in IndexedDB, does not allow specifying `indexed` (for example).

#### Synthetic indexes

`synthetics` are additional indexes which are computed from the data in a document. For example, if you _did_ want to index `done` (which is probably a good idea), you could create a synthetic index which converts it to a string:

```ts
synthetics: {
  indexableDone: {
    type: 'string',
    compute: (item) => item.done.toString()
  }
}
```

This field won't be present on a todo item in your code, but it will be queryable.

#### Compound indexes

Compound indexes are a special case of synthetic index with more structure and query options. You can use them to query on two or more fields at once. For example, if you had a compound index

```
compounds: {
  done_details: {
    of: ['indexableDone', 'details']
  }
}
```

you can query for items which are done, in alphabetical order by their details. This may be faster than querying only by `indexableDone` and then sorting in-memory. You can also match values of multiple properties - you could query for incomplete items called "wash dishes," for example.

#### Migrations

You must define a migration for each version of your schema. `createDefaultMigration` will just keep any existing documents in-place and create or delete any new or removed indexes. You can use this for your first version, and if you ever make a version that only adds or removes indexes.

If you change the shape of your data, though, you will need to write a full migration. Docs are todo on this, but the tool to do that is exported as `migrate` and takes a function where you run all of your data transformers using tools supplied in the first argument.

#### Constructing the client

Once you have a schema, you create a client like this

```ts
import { StorageDescriptor, WebSocketSync } from '@lofi-db/web';
import { v1Schema, migration } from './v1.js';

// extend built-in types to specify presence information
// so it's typed throughout your app
declare module '@lofi-db/web' {
	export interface Presence {
		emoji: string;
	}

	export interface Profile {
		// any data you may have put in profiles on the server
	}
}

const todosDesc = new StorageDescriptor({
	sync: new WebSocketSync('wss://your-websocket-server.com'),
	schema: v1Schema,
	migrations: [migration],
	initialPresence: {
		emoji: '',
	},
});

// asynchronously opens the database and performs migrations
const todos = await todosDesc.open();
```

Client startup is asynchronous, but you can access metadata on StorageDescriptor or pass it around to anything which needs storage context synchronously. Synchronous code which will need access to the same Storage instance can await `StorageDescriptor.open()` individually; they will all get the same final instance.

#### Queries and mutations

You can use this client in your app now to store and query data. Use the root storage instance to create queries to find documents.

```ts
const firstDoneItemQuery = todos.findOne({
	where: 'indexableDone',
	equals: 'true',
});

// subscribe to changes in the query
const unsubscribe = firstDoneItemQuery.subscribe((item) => {
	console.log(item);
});

// await the first resolved value
const oneDoneItem = await firstDoneItemQuery.resolved;

// modify a document
oneDoneItem.set('done', false);
```

There are a few quirks to usage:

- Queries return query objects immediately with empty data. Await `.resolved` to get the final results, or use `<source collection>.subscribe(query, callback)` to subscribe to changes over time.
- Subscribed queries stay in memory and updating until you unsubscribe all subscribers
- Subscribed queries of the same kind are cached - if you query the same exact thing twice, you'll get back the original query _if it has been subscribed_. Queries are only disposed when all subscribers leave.

#### Documents and Entities

Queries return Documents. A Document provides a `.get` method to retrieve properties, and a `.set` to set them - as well as other utility methods depending on its type. All root documents are Object Entities, which also provide `.update`. Since Documents can contain arbitrary sub-objects, you can retrieve lists off them, which comes as List Entities and provide some common list methods too.

These methods are, of course, typed based on the shape of your schema definitions!

```ts
oneDoneItem.set('done', false);

anItemWithAnArrayField.get('arrayField').push('foo');
```

These will immediately update the in-memory document across all its subscribers (Entities are also cached by identity). The change will propagate to storage and sync asynchronously. When the change is stored, the document will update and drop the in-memory changes.

### Syncing

Lofi doesn't sync by default. It's offline-first, sync-optional. I built it that way because my goal is to support nice local-only anonymous experiences, and add sync & realtime on as an incentive to sign up (and potentially subscribe) to your app.

To start syncing, call `storage.sync.start` (where `storage` is your instance of Storage, i.e. `todos` above) This will connect to your websocket server. It's up to you to add any authentication and authorization to reject unregistered or unsubscribed clients if you want to limit access to sync. Lofi itself will sync whoever you let connect.

If you want to pause sync, call `storage.sync.stop` (where `storage` is your instance of Storage, i.e. `todos` above).

### Presence

Once you're syncing, presence info is available on `storage.presence` (where `storage` is your instance of Storage, i.e. `todos` above).

You can get `presence.self`, `presence.peers`, or `presence.everyone`. You can also subscribe to change events: `peerChanged(userId, presence)`, `selfChanged(presence)`, `peersChanged(peers: { [userId]: presence })`. Note that if you did not supply user information on your server and used the example code above, all peers will show up with the same exact identity! If you want to make each peer individual, you need to give them all unique user IDs. You could generate them on your server in-memory if you don't want persistent profiles.

Lofi distinguishes between "replica ID" (i.e. individual device) and "user ID." The intention is to allow one actual person to use multiple devices, but only have one presence which follows them between devices.

To update your presence, use `presence.update`.

### React

Lofi has a React bindings library, `@lofi-db/react`. It exports one function, `createHooks`. Pass your Storage instance into that.

It will generate named hooks based on each document collection, plus a few utility hooks. For example, if you have the collection `todoItems`, you will get these hooks:

- `useAllTodoItems`: pass an index query to filter the list of returned items
- `useTodoItems`: forgive the pluralization issue here. Retrieves one document. You pass in an id.
- `useWatch`: pass a "live document" to this and the component will update when that document changes. An unfortunate necessity of the WIP reactive object approach.
- `useSelf`: returns your own presence.
- `usePeerIds`: returns an array of string user IDs of peers. Good for iterating over peers to render them.
- `usePeer`: pass a peer's user ID to retrieve their presence.
- `useSyncStatus`: returns a boolean indicating whether sync is active or not.

As you can see from some of that, React hooks are pretty WIP still.

#### Suspense

The hooks use Suspense so that you don't have to write loading state conditional code in your components. All hooks return data directly. If the data is not ready, they suspend.

Wrap your app in a `<Suspense>` to handle this. You can create multiple layers of Suspense to handle loading more granularly.
