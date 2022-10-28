---
sidebar_position: 1
---

# Sync Server

lo-fi doesn't sync by default. It's offline-first, sync-optional. I built it that way because my goal is to support nice local-only anonymous experiences, and add sync & realtime on as an incentive to sign up (and potentially subscribe) to your app.

To start syncing, you must first host a server - just a few lines of code.

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

## Profiles

The `profiles` configuration option accepts anything that implements the profiles interface - which is just a `get(userId)` function. It can return any data your app permanently associates with a particular user. This data is utilized in the [presence](./presence) system to give clients access to read-only, trusted information about particular users. A default name is recommended if you have one for your user. A profile image is also a good idea!
