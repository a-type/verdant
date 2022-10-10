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

The server code needs to be plugged into a websocket server. Right now you also have to do a little bookkeeping to manage client identities. Hopefully the DX of this will improve soon.

#### Sending messages to clients

First you need to create a class which implements `MessageSender`, which lofi's server code will use to emit messages back to clients. A simple implementation could be an EventEmitter, which your socket server could listen to and forward those messages to the appropriate client socket connection.

```ts
import { ServerMessage, MessageSender } from '@lofi/server';

class OutgoingMessages extends EventEmitter implements MessageSender {
	broadcast = (
		libraryId: string,
		message: ServerMessage,
		omitReplicas: string[] = [],
	) => {
		this.emit(`broadcast`, libraryId, message, omitReplicas);
	};

	send = (libraryId: string, replicaId: string, message: ServerMessage) => {
		this.emit(`send`, replicaId, message);
	};
}

// exposing a singleton to be used by the socket server
export const outgoingMessages = new OutgoingMessages();
```

#### Creating the storage layer

Create a new instance of `ServerStorage` and pass in a file path where you want your SQLite database to be created. You must also pass in an implementation of the `UserProfiles` interface which provides basic immutable user information for the realtime presence features. This can be nothing if you don't need profiles in presence.

```ts
import { ServerStorage, UserProfiles } from '@lofi/server';

const storageDb = create(storageDbFile);

class Profiles implements UserProfiles<any> {
	get = (userId: string) => {
		// for example, if you have your own database with registered users, you
		// can load them here. results will be cached.
		return prisma.profile.findUnique({ where: { id: userId } });
	};
}

export const storage = new ServerStorage(
	storageDb,
	outgoingMessages,
	new Profiles(),
);
```

#### Connecting storage and messaging to your socket server

Now what remains is to hook these pieces up to a server that can manage incoming websocket connections. As mentioned, at the moment there is some bookkeeping to do so we can associate which messages come from which connection, and which connections belong to which library. With no authentication, this might look like this...

```ts
import { WebSocketServer, WebSocket } from 'ws';
import { ServerMessage, ClientMessage } from '@lofi/server';
import { storage } from './storage.js';
import { outgoingMessages } from './outgoingMessages.js';

const wss = new WebSocketServer();

/**
 * Once a connection identifies its replicaId (via the
 * initial sync message), we associate them so we can deliver
 * replica-specific messages to the right client.
 */
const replicaToConnectionMap = new Map<string, WebSocket>();
/**
 * The reverse lookup map
 */
const connectionToReplicaIdMap = new WeakMap<WebSocket, string>();
/**
 * Likewise we group clients by libraryId so we can broadcast
 * to all clients in a library.
 */
const libraryToConnectionMap = new Map<string, WebSocket[]>();

wss.on('connection', (ws: WebSocket) => {
	// add the client to its library group
	const libraryId = identity.planId;
	const connections = libraryToConnectionMap.get(libraryId) || [];
	connections.push(ws);
	libraryToConnectionMap.set(libraryId, connections);

	ws.on('message', (message) => {
		const data = JSON.parse(message.toString()) as ClientMessage;

		// the first message from a connection is always "sync" -
		// this is where we detect replicaId and store that association.
		if (data.type === 'sync') {
			replicaToConnectionMap.set(data.replicaId, ws);
			connectionToReplicaIdMap.set(ws, data.replicaId);
		}

		// if you have authentication and users in your app, you'll want
		// to associate this websocket connection to one and reference their
		// userId here. this can be done in a variety of ways, like with a special
		// starting message. I prefer to use HTTP cookies which are detected on
		// the UPGRADE event of the socket just like a normal request, but that
		// code is more complicated than this example.
		// https://github.com/websockets/ws#client-authentication
		const userId = 'anonymous';
		storage.receive(identity.planId, data, userId);
	});

	// when a client disconnects, we remove them from presence using the
	// replicaId and library associations we establish above
	ws.on('close', () => {
		const replicaId = connectionToReplicaIdMap.get(ws);
		if (!replicaId) {
			console.warn('Unknown replica disconnected');
			return;
		}

		// this is the line which removes the client's presence
		storage.remove(identity.planId, replicaId);

		if (replicaToConnectionMap.has(replicaId)) {
			replicaToConnectionMap.delete(replicaId);
		}
		const connections = libraryToConnectionMap.get(libraryId);
		if (connections) {
			connections.splice(connections.indexOf(ws), 1);
		}
	});
});

// listen for outgoing messages on our bus and
// forward them to the appropriate clients
outgoingMessages.on(
	'broadcast',
	(libraryId: string, message: ServerMessage, omitReplicas: string[]) => {
		const connections = libraryToConnectionMap.get(libraryId) || [];
		connections.forEach((connection) => {
			const replicaId = connectionToReplicaIdMap.get(connection);
			if (replicaId && !omitReplicas.includes(replicaId)) {
				connection.send(JSON.stringify(message));
			}
		});
	},
);

outgoingMessages.on('send', (replicaId: string, message: ServerMessage) => {
	const connection = replicaToConnectionMap.get(replicaId);
	if (connection) {
		connection.send(JSON.stringify(message));
	}
});
```

This is not the simplest code, and not nearly as easy to set up as I'd like it to be! Bear with me as I identify ways to internalize some of these concerns into lofi itself.

### Client

#### Creating a schema

The first step client-side is to define a schema of what kind of documents you are working with. A schema looks like this:

```ts
import { collection, schema, createDefaultMigration } from '@lofi/web';

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
import { StorageDescriptor, WebSocketSync } from '@lofi/web';
import { v1Schema, migration } from './v1.js';

// extend built-in types to specify presence information
// so it's typed throughout your app
declare module '@lofi/web' {
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

Lofi has a React bindings library, `@lofi/react`. It exports one function, `createHooks`. Pass your Storage instance into that.

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
