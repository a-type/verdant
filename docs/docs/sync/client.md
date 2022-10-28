---
sidebar_position: 3
---

# Connecting a Client

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

## Custom auth fetch

By default the client will make a basic `fetch` to your auth endpoint with `credentials: 'include'`. If this endpoint is hosted on a server which your client already has a cookie session with, it should work out of the box.

If you use another solution for sessions, like a JWT in a header, you can pass in `fetchAuth` instead of `authEndpoint` to the sync configuration. This function must return a promise for the JSON response body of the authorization endpoint.
