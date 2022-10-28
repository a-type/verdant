# lo-fi

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

This is a very experimental set of libraries which I'm developing slowly alongside my app [Aglio](https://aglio.gfor.rest) to suit my [own goals](https://blog.gfor.rest/blog/lo-fi-intro). The usage and behavior is subject to change, although I will either try to avoid changes that fundamentally change how data is stored, or provide upgrade paths which won't disrupt apps already in use as much as possible.

Documentation will be sparse for a while. If you'd like to see a full-sized example, [Aglio is open source.](https://github.com/a-type/aglio)

Here's a rough list of things which may change in the near future:

- I might pivot to code-generation based on a schema file instead of runtime-defined schema with complex TypeScript types
- I'll probably drop in a new reactive queries and documents solution, as my current proxy-based one can be a little confusing

## Usage

These docs cover how to set up a schema, generate a client, and do some basic queries first. All local.

In a later section I also cover how to start syncing data to a server and other clients.

> Note that throughout examples below I'm using TypeScript and ESModule syntax - so imports include a `.js` filetype, even though the imported files are TypeScript. That's just the state of current ESM! lo-fi was built in ESM and supports it explicitly. I've also tried to support CJS but don't use it personally anymore.

### Client

#### Creating a schema

The first step client-side is to define a schema of what kind of documents you are working with. A schema looks like this:

```ts
import { collection, schema } from '@lo-fi/web';

const todoItems = collection({
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

export default schema({
	version: 1,
	collections: {
		todoItems: todoItems,
	},
});
```

This schema creates 1 document type, `todoItem`, and defines some fields. It also creates the initial default migration to set up this schema in IndexedDB.

The TypeScript types for `collection` should enforce proper schema shape. Note that the `boolean` field type, which is not indexable in IndexedDB, does not allow specifying `indexed` (for example).

#### Generate the client code

Using this schema, you can generate your typed client code using lo-fi's CLI.

```
> npm i --dev @lo-fi/cli

> lo-fi --schema src/stores/todos/schema.ts --output src/stores/todos/client --react
```

The CLI takes `schema` (the path to your schema TS file), `output` (the directory to output generated code), and `--react` (optional, generates React hooks to query your data).

> **Important:** right now the input schema format for the CLI is quite strict. Ensure your schema is structured exactly the same as the one above, particularly:
>
> - `collection` and `schema` are used to wrap all definitions
> - It has a default export of the schema itself
> - All collections are defined separately
> - Collection key/values are specified with the verbose `todoItems: todoItems` syntax, not shorthand
>
> Bear with as I get through the backlog of improvements to make this less rigid!

Now you can import your client from the output directory and construct its descriptor:

```ts
import { ClientDescriptor } from './client/index.js';
import schema from './schema.js';
// see next section!
import migrations from './migrations.js';

const clientDesc = new ClientDescriptor({
	namespace: 'todos',
	schema,
	migrations,
});

clientDesc.open().then((client) => {
	client.todoItems.create({
		id: '1',
		details: 'Create a lo-fi client',
		done: true,
	});
});
```

Client startup is asynchronous, but you can access metadata on StorageDescriptor or pass it around to anything which needs storage context synchronously. Synchronous code which will need access to the same Storage instance can await `StorageDescriptor.open()` individually; they will all get the same final instance.

If you are building in React, be sure to pass `--react` to the CLI and see the [docs](#react) on how to use it, since the built-in React support effectively hides the async waits for a much better DX!

But before you can use the code above, you need to create your first migration.

#### Migrations

Every schema change requires a migration, including the initial one. While CLI migration management is not yet completed, I recommend creating a `migrations` directory in your generated client directory and adding the initial migration for your schema manually in a file `v1.ts`:

```ts
// client/migrations/v1.ts

import { createDefaultMigration } from '@lo-fi/web';
import schema from '../../schema.ts';

export default createDefaultMigration(schema);
```

Then collect the migrations in order as an array to provide to the client:

```ts
// client/migrations.ts
import v1 from './migrations/v1.js';

export default [v1];
```

Work is planned for the CLI to create and maintain this file structure for you.

`createDefaultMigration` will just keep any existing documents in-place and create or delete any new or removed indexes. You can use this for your first version, and if you ever make a version that only adds or removes indexes.

If you change the shape of your data, though, you will need to write a full migration. Docs are todo on this, but the tool to do that is exported as `migrate` and takes a function where you run all of your data transformers using tools supplied in the first argument.

### Querying data

By default you can retrieve lists of all documents in a collection, or just one by its primary key.

To do more complex queries, you must index fields or create new indexes.

#### Indexing existing fields

For field types which support indexing (string, number), add `indexed: true` to index that field. This enables quick lookup by specific value, or by range.

#### Synthetic indexes

`synthetics` are additional indexes which are computed from the data in a document. For example, if you _did_ want to index the boolean field `done`, you could create a synthetic index which converts it to a string:

```ts
synthetics: {
  indexableDone: {
    type: 'string',
    compute: (item) => item.done.toString()
  }
}
```

This field won't be present on a todo item in your code, but it will be queryable.

You can use any synchronous logic you want to create synthetic indexes. But you should keep them deterministic!

#### Compound indexes

Compound indexes are a special case of synthetic index with more structure and query options. You can use them to query on two or more fields at once. For example, if you had a compound index

```
compounds: {
  done_details: {
    of: ['done', 'details']
  }
}
```

you can query for items which are done, in alphabetical order by their details. This may be faster than querying only by `indexableDone` and then sorting in-memory. You can also match values of multiple properties - you could query for incomplete items called "wash dishes," for example.

Values in compound indexes will be coerced to strings automatically.

#### Queries and mutations

You can use this client in your app now to store and query data. Use the root storage instance to create queries to find documents.

```ts
const firstDoneItemQuery = todos.todoItems.findOne({
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

- Queries return query objects immediately with empty data. Await `.resolved` to get the final results, or use `query.subscribe(callback)` to subscribe to changes over time.
- Subscribed queries stay in memory and update until you unsubscribe all subscribers
- Subscribed queries of the same kind are cached - if you query the same exact thing twice, you'll get back the original query _if it has been subscribed_. Queries are only disposed when all subscribers leave.

#### Querying your indexes

lo-fi generates typings for filters on the indexes you create on your collections. Explore the generated TypeScript definitions to see what your query options are.

Indexed fields and compound indexes generate exact and range query filters. Compound indexes generate match filters.

```ts
// field / synthetic filters:
export interface TodoIdMatchFilter {
	where: 'id';
	equals: string;
	order?: 'asc' | 'desc';
}

export interface TodoIdRangeFilter {
	where: 'id';
	gte?: string;
	gt?: string;
	lte?: string;
	lt?: string;
	order?: 'asc' | 'desc';
}

// compound filters:
export interface TodoTagsSortedByDoneCompoundFilter {
	where: 'tagsSortedByDone';
	match: {
		tags?: string;
		done?: boolean;
	};
	order: 'asc' | 'desc';
}
```

When using a compound filter, you must match values in the order they were specified in your `of` list. For example, if your `of` list was `['tags', 'done']`, you may not match `done` without also matching `tags` - but you can match `tags` alone, in which case items will be ordered by `done`.

TODO: more docs on how index queries work.

#### Documents and Entities

Queries return Documents. A Document provides a `.get` method to retrieve properties, and a `.set` to set them - as well as other utility methods depending on its type. All root documents are Object Entities, which also provide `.update`. Since Documents can contain arbitrary sub-objects, you can retrieve lists off them, which comes as List Entities and provide some common list methods too.

These methods are, of course, typed based on the shape of your schema definitions!

```ts
oneDoneItem.set('done', false);

anItemWithAnArrayField.get('arrayField').push('foo');
```

These will immediately update the in-memory document across all its subscribers (Entities are also cached by identity). The change will propagate to storage and sync asynchronously. When the change is stored, the document will update and drop the in-memory changes.

### Syncing

lo-fi doesn't sync by default. It's offline-first, sync-optional. I built it that way because my goal is to support nice local-only anonymous experiences, and add sync & realtime on as an incentive to sign up (and potentially subscribe) to your app.

To start syncing, you must first host a server - just a few lines of code.

### Server

The server can be run standalone, or plugged into an existing HTTP server. It requires a few things to be constructed:

- A path to a SQLite database to store data
- An authorization function which it uses to determine connected client identity and library access
- Optional: an interface implementation to provide more detailed user profile information for presence features

Create a server like this:

```ts
import { Server } from '@lo-fi/server';

const server = new Server({
	databaseFile: 'path/to/db.sqlite',
	tokenSecret: process.env.LOFI_SECRET,
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
	// you can attach lo-fi to it instead of running it separately.
	httpServer: myExistingServer,
});

// if you did not provide your own http server, call listen to begin
// serving requests
server.listen(8080, () => {
	console.log('Ready!');
});
```

If you want to attach to an existing HTTP server, you will also need to set up an HTTP endpoint to handle HTTP requests on the `/lofi` subpath. For example, using Express:

```ts
app.use('/lofi', server.handleRequest);
```

Custom HTTP server support is a little limited right now. It should support Connect/Express-like middleware.

### Setting up authorization and getting a token

To connect to sync, you must create an auth endpoint. This can be done automatically on the same server you use for sync, or you can define a custom endpoint on a different server.

Your endpoint must determine a `userId` and `libraryId` for the connecting client and provide them to a `TokenProvider`, then return the created access token and the sync endpoint URL as JSON.

Below is an example of a basic auth endpoint which gets a session for the request (according to custom logic you should provide)

```ts
import { Request, Response } from 'express';
import { TokenProvider } from '@lo-fi/server';

const tokenProvider = new TokenProvider({
	// this must be the exact same secret as the one you supplied to Server
	secret: process.env.LOFI_SECRET!,
});

async function getLoginSession(req: Request) {
	// here you would, say, read a cookie value and retrieve
	// a session from a database, or decode a JWT.
}

function lofiHandler(req: Request, res: Response) {
	const session = await getLoginSession(req);
	if (!session) {
		return res.status(401).send('Please log in');
	}

	// this is just one way to decide what library the user can
	// sync to with this token. you might instead store
	// the user's library in their session, or use their userId
	// as a personal library ID. Library ID is up to you, but
	// every user who is given access to the same library will
	// be interacting with the same data!
	const libraryId = req.params.libraryId;

	// TODO: before creating at token, if your library ID was determined
	// by a user-supplied value (such as our request param above),
	// you should probably authorize access for the client user.

	const token = tokenProvider.getToken({
		userId: session.userId,
		libraryId: session.planId,
	});

	res.status(200).json({
		accessToken: token,
		// change this line to point to the correct host for your sync
		// server. if you have multiple environments, this must take them
		// into account.
		syncEndpoint: `http://localhost:3000/lofi`,
	});
}
```

This endpoint, wherever you choose to host it, will be supplied to the client to connect, authorize, and start syncing with your server.

Although it may seem cumbersome to have a separate endpoint for auth and sync, this flexibility allows you to host your main app server separately from your lo-fi sync server, or even implement advanced architectures like spinning up a new server for each library.

### Configuring client sync

To connect your client to the server, you must pass it sync configuration.

```ts
import { ClientDescriptor, ServerSync } from './client/index.js';
import schema from './schema.js';
import migrations from './migrations.js';

const clientDesc = new ClientDescriptor({
	namespace: 'todos',
	schema,
	migrations,
	sync: {
		initialPresence: {
			emoji: '',
		},
		authEndpoint: 'http://localhost:3000/auth/lofi',
	},
});

clientDesc.open().then((todos) => {
	// now we have a todo data client, "todos"
});
```

You may also define type overrides to provide typing for presence data:

```ts
// extend built-in types to specify presence information
// so it's typed throughout your app
declare module '@lo-fi/web' {
	export interface Presence {
		emoji: string;
	}

	export interface Profile {
		// any data you may have put in profiles on the server
	}
}
```

To start syncing, call `client.sync.start` (where `client` is your instance of Client, i.e. `todos` above) This will connect to your websocket server. It's up to you to add any authentication and authorization to reject unregistered or unsubscribed clients if you want to limit access to sync. lo-fi itself will sync whoever you let connect.

If you want to pause sync, call `client.sync.stop` (where `client` is your instance of Client, i.e. `todos` above).

#### Custom auth fetch

By default the client will make a basic `fetch` to your auth endpoint with `credentials: 'include'`. If this endpoint is hosted on a server which your client already has a cookie session with, it should work out of the box.

If you use another solution for sessions, like a JWT in a header, you can pass in `fetchAuth` instead of `authEndpoint` to the sync configuration. This function must return a promise for the JSON response body of the authorization endpoint.

### Presence

Once you're syncing, presence info is available on `client.presence` (where `client` is your instance of Client, i.e. `todos` above).

You can get `presence.self`, `presence.peers`, or `presence.everyone`. You can also subscribe to change events: `peerChanged(userId, presence)`, `selfChanged(presence)`, `peersChanged(peers: { [userId]: presence })`. Note that if you did not supply user information on your server and used the example code above, all peers will show up with the same exact identity! If you want to make each peer individual, you need to give them all unique user IDs. You could generate them on your server in-memory if you don't want persistent profiles.

lo-fi distinguishes between "replica ID" (i.e. individual device) and "user ID." The intention is to allow one actual person to use multiple devices, but only have one presence which follows them between devices.

To update your presence, use `presence.update`.

### Switching transports

lo-fi can sync over HTTP requests or WebSockets. By default, it automatically uses HTTP when a user is the only one connected to a library, and switches to WebSockets when other users are online.

You can disable this functionality by passing `sync.automaticTransportSelection: false` to your client descriptor config, and change transport manually by using `sync.setMode('realtime' | 'pull')`.

### React

lo-fi has React hooks generation. To enable it, pass `--react` to the CLI. A new module `react.js` will be emitted in the output directory. It exports one function, `createHooks`. Pass your ClientDescriptor instance into that.

```ts
import { ClientDescriptor, ServerSync } from './client/index.js';
import { createHooks } from './client/react.js';
import schema from './schema.js';
import migrations from './migrations.js';

const clientDesc = new ClientDescriptor({
	namespace: 'todos',
	schema,
	migrations,
	sync: new ServerSync({
		host: 'https://your.server/lofi',
	}),
	initialPresence: {
		emoji: '',
	},
});

const hooks = createHooks(clientDesc);
```

It will generate named hooks based on each document collection, plus a few utility hooks. For example, if you have the collection `todoItems`, you will get these hooks:

- `useAllTodoItems`: pass an index query to filter the list of returned items.
- `useOneTodoItem`: pass an index query to filter the list of returned items, and only take the first match.
- `useTodoItem`: Retrieves one document. You pass in an id.
- `useWatch`: pass a "live document" to this and the component will update when that document changes. An unfortunate necessity of the WIP reactive object approach.
- `useSelf`: returns your own presence.
- `usePeerIds`: returns an array of string user IDs of peers. Good for iterating over peers to render them.
- `usePeer`: pass a peer's user ID to retrieve their presence.
- `useSyncStatus`: returns a boolean indicating whether sync is active or not.

As you can see from some of that, React hooks are pretty WIP still.

#### Suspense

The hooks use Suspense so that you don't have to write loading state conditional code in your components. All hooks return data directly. If the data is not ready, they suspend.

Wrap your app in a `<Suspense>` to handle this. You can create multiple layers of Suspense to handle loading more granularly.
