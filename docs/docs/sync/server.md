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
const clientDesc = new ClientDescriptor({
	namespace: 'whatever',
	sync: cliSync('<a library id>'),
});
```

`libraryId` can be anything. Users connected to the same library sync together. You might put it in the URL path or something.

## A real server

To start syncing in production scenarios, you must first host a server - just a few lines of code.

The server can be run standalone, or plugged into an existing HTTP server. It requires a few things to be constructed:

- A path to a SQLite database to store data
- An authorization function which it uses to determine connected client identity and library access
- Optional: an interface implementation to provide more detailed user profile information for presence features

Create a server like this:

```ts
import { Server } from '@verdant-web/server';
import { sqlStorage } from '@verdant-web/server/storage';

const server = new Server({
	storage: sqlStorage({ databaseFile: 'verdant.sqlite' }),
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
	// you can attach Verdant to it instead of running it separately.
	httpServer: myExistingServer,
});

// if you did not provide your own http server, call listen to begin
// serving requests
server.listen(8080, () => {
	console.log('Ready!');
});
```

If you want to attach to an existing HTTP server, you will also need to set up an HTTP endpoint to handle HTTP requests on the `/sync` subpath. For example, using Express:

```ts
app.use('/sync', server.handleRequest);
```

Custom HTTP server support is a little limited right now. It should support Connect/Express-like middleware.

## Profiles

The `profiles` configuration option accepts anything that implements the profiles interface - which is just a `get(userId)` function. It can return any data your app permanently associates with a particular user. This data is utilized in the [presence](./presence) system to give clients access to read-only, trusted information about particular users. A default name is recommended if you have one for your user. A profile image is also a good idea!

## Evicting libraries from server storage

In keeping with the Verdant principle of [matching infrastructure cost with user revenue](../manifesto), the server lets you selectively "evict" libraries from storage.

You can evict libraries when a user ends their subscription. This will free up space in your database without disrupting the user's local copy of their data.

If the user decides to subscribe again, you don't need to do anything - whenever they sync again, the server will be sure to restore the library from their replica.

To evict a library, just call `server.evictLibrary('library-id')`.

### Using eviction for contingency scenarios

Although I've done a lot of testing to try to make Verdant as consistent and reliable as possible under a variety of circumstances, I can never guarantee it's bug-free.

You may reach a situation where a user reaches out about problems with sync. Maybe devices are not consistent, or changes are being reverted.

The first thing to check would be that the user has the latest version of your client code. But after that, you could expose an admin-only endpoint on your server which calls `server.evictLibrary`. This may seem dangerous, but it's pretty safe! The user will need to reconnect with a device which has a good copy of their data to restore their library to the server. If they're already connected to sync when you do this, their device will reconnect and reupload automatically.

Other replicas which may have interacted with the library will be forced to reset back to this known state, so they'll lose any offline or out-of-sync changes -- but that's kind of the point; starting back at a clean slate.

If this ever does happen to you, reach out with any details you can give me about what happened. Although I do feel better having these failsafes, I'd rather have Verdant be 100% reliable and bug-free.
