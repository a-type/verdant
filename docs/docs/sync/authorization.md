---
sidebar_position: 2
---

# Authorizing Sync

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
