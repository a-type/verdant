---
sidebar_position: 1
---

# Sync Server

Verdant doesn't sync by default. It's offline-first, sync-optional. I built it that way because my goal is to support nice local-only anonymous experiences, and add sync & realtime on as an incentive to sign up (and potentially subscribe) to your app.

## Quickstart

Verdant provides a simple CLI server which can be used to try out sync and prototype. It's not recommended to deploy this server or use it in a production capacity, as it completely ignores authentication and authorization.

To use this server, run:

```
verdant-server --port 3242
```

No options are required. `--port` sets a port, `--secret` sets a token signing secret (the default one is not at all secure).

This server will store data in a SQLite database file called `verdant.sqlite` in the current directory.

To connect to your prototyping sync server, pass the following options to your Verdant client descriptor constructor (the server CLI also outputs instructions for this):

```ts
import { cliSync } from '@verdant-web/store';

const clientDesc = new ClientDescriptor({
	namespace: 'whatever',
	sync: cliSync('<a library id>'),
});
```

`libraryId` can be anything. Users connected to the same library sync together. You might put it in the URL path or something.

## A real server

To start syncing in production scenarios, you must first host a server.

> **Tip:** using Cloudflare? Verdant now supports Cloudflare via a separate [adapter](./cloudflare.md)

A Node server requires a few things:

- A SQLite database directory to store data
- An authorization function which it uses to determine connected client identity and library access
- Optional: an interface implementation to provide more detailed user profile information for presence features

Verdant's Node server implementation is based on Hono, a nice little HTTP server framework. Some assembly is required.

```ts
import { createHonoRouter } from '@verdant-web/server/node';
import { sqlShardStorage } from '@verdant-web/server/storage';
import { LocalFileStorage, TokenProvider } from '@verdant-web/server';

// for the Hono server parts
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';

// the "core" is a service API for interacting with libraries.
// you could plug this into your own HTTP or other kind of interface,
// but further on are some Hono-based tools to help get started.
const core = createVerdant({
	// SQLite databases for each library are stored in this directory
	storage: sqlShardStorage({
		databasesDirectory: 'verdant-dbs',
	}),
	// implement .get to retrieve detailed profile information for sync users
	profiles: {
		get: async (userId: string) => {
			// you could fetch a profile record from a database here to augment
			// this profile with name, image, etc.
			// values will be cached, so don't worry too much about timing.
			return { id: userId };
		},
	},
	// required to validate sync access tokens generated from
	// your API
	tokenSecret: process.env.TOKEN_SECRET,
	// optional; enables file sync
	fileStorage: new LocalFileStorage({
		rootDirectory: 'verdant-files',
		// this matches an API you must host (see below)
		host: `http://localhost:${port}/files`,
	}),
	// optional logger
	log?: (level, ...args) => console.log(level, ...args),
})

// our verdant router will be mounted to a subpath
// and handle all HTTP sync requests
const verdantRouter = createHttpRouter(core);

// this is "your" app -- Verdant lives in it,
// but you control the API.
const app = new Hono()
	.route('/verdant', verdantRouter)
	// issue sync tokens
	.get('/auth/:libraryId', async (ctx) => {
		// here you authenticate your user, authorize
		// their access to a particular library, and
		// issue a token.
		const library = ctx.req.param('library');

		const user = // your own session / auth logic here

		// remember to check that the user is allowed to sync
		// to this library

		const token = tokenProvider.getToken({
			libraryId: library,
			userId: user,
			// this subpath matches the verdantRouter mount
			syncEndpoint: `http://127.0.0.1:${port}/verdant`,
			type,
		});
		return ctx.json({
			accessToken: token,
		});
	})
	// (optional) serve uploaded files
	// if you use LocalFileStorage
	.get('/files/*', serveStatic({
		root: 'verdant-files',
		rewriteRequestPath: (path) => path.replace('/files/', ''),
	}));

const server = serve({
	fetch: app.fetch,
	port
});

// handle websocket sync! must be done like this, not included
// in createHttpRouter!
const onUpgrade = createNodeWebsocketHandler(core);
server.addListener('upgrade', onUpgrade);

server.addListener('listening', () => {
	console.info(`🌿 Verdant Server listening on http://localhost:${port}`);
});
```

Now, you might think that's a lot of work. That's fair. But the pieces are purposefully a little componentized / low level to keep things adaptable. You can swap out your file storage and integrate Verdant into an existing Hono app or extend the boilerplate above with your own APIs. You also have control over where Verdant mounts, what authorization is applied to libraries, who users are, etc.

## Profiles

The `profiles` configuration option accepts anything that implements the profiles interface - which is just a `get(userId)` function. It can return any data your app permanently associates with a particular user. This data is utilized in the [presence](./presence) system to give clients access to read-only, trusted information about particular users. A default name is recommended if you have one for your user. A profile image is also a good idea!

## Evicting libraries from server storage

In keeping with the Verdant principle of [matching infrastructure cost with user revenue](../manifesto), the server lets you selectively "evict" libraries from storage.

You can evict libraries when a user ends their subscription. This will free up space in your database without disrupting the user's local copy of their data.

If the user decides to subscribe again, you don't need to do anything - whenever they sync again, the server will be sure to restore the library from their replica.

To evict a library, just call `core.evict('library-id')`.

### Using eviction for contingency scenarios

Although I've done a lot of testing to try to make Verdant as consistent and reliable as possible under a variety of circumstances, I can never guarantee it's bug-free.

You may reach a situation where a user reaches out about problems with sync. Maybe devices are not consistent, or changes are being reverted.

The first thing to check would be that the user has the latest version of your client code. But after that, you could expose an admin-only endpoint on your server which calls `core.evict`. This may seem dangerous, but it's pretty safe! The user will need to reconnect with a device which has a good copy of their data to restore their library to the server. If they're already connected to sync when you do this, their device will reconnect and reupload automatically.

Other replicas which may have interacted with the library will be forced to reset back to this known state, so they'll lose any offline or out-of-sync changes -- but that's kind of the point; starting back at a clean slate.

If this ever does happen to you, reach out with any details you can give me about what happened. Although I do feel better having these failsafes, I'd rather have Verdant be 100% reliable and bug-free.
