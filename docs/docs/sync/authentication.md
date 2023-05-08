---
sidebar_position: 2
---

# Authenticating Sync

To connect to sync, you must create an auth endpoint. This can be done automatically on the same server you use for sync, or you can define a custom endpoint on a different server.

Your endpoint must determine a `userId` and `libraryId` for the connecting client and provide them to a `TokenProvider`, then return the created access token and the sync endpoint URL as JSON.

Below is an example of a basic auth endpoint which gets a session for the request (according to custom logic you should provide)

```ts
import { Request, Response } from 'express';
import { TokenProvider } from '@verdant-web/server';

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
		// change this line to point to the correct host for your sync
		// server. if you have multiple environments, this must take them
		// into account.
		syncEndpoint: `http://localhost:3000/sync`,
		// additional token options are available. see below.
	});

	res.status(200).json({
		accessToken: token,
	});
}
```

This endpoint, wherever you choose to host it, will be supplied to the client to connect, authorize, and start syncing with your server.

Although it may seem cumbersome to have a separate endpoint for auth and sync, this flexibility allows you to host your main app server separately from your Verdant sync server, or even implement advanced architectures like spinning up a new server for each library.

## Additional token options

More options can be specified to customize your token. These customizations can be very meaningful for client experience, so don't overlook this.

- `role`: Provide your own role identifier for object-level authorization (TODO)
- `type`: Specify a token type to change the client abilities and behavior in the syncing algorithm. See below.
- `expiresIn`: Change how long the token is valid before a new one must be fetched. The client will automatically cache and refetch tokens based on expiry.

### Token types

Token type determines how a replica client behaves with respect to sync transport and consensus.

#### Realtime vs. Push/Pull

The `Realtime` token types allow live websocket subscription to changes.

The `Push`/`Pull` token types forbid realtime socket subscription and restrict the client to HTTP requests for syncing.

#### Passive

`Passive` token types are second-class replicas with respect to consensus. The server and peers will not wait for these clients to acknowledge changes before compressing history. This means **offline passive replicas lose changes.** When a passive replica comes back online, any locally stored unapplied operations will be dropped. The flipside of this is that other peers don't need to wait for these replicas to come online and acknowledge operations to compress their history.

To illustrate, imagine a blog app where the owner of the blog can publish posts, and followers can comment on those posts.

All replicas controlled by the owner should have a non-`Passive` token type. That allows the owner to edit their posts offline with assurance that any of their devices will wait for all of their other devices to come online and acknowledge changes before history is compressed, which is key to conflict resolution if they draft things on multiple devices.

However, the number of followers could be very high, and they may not visit the blog very frequently. We wouldn't want to wait for every past visitor to the site to sign off on every change before compacting it down. So we can give visitors a `Passive` token type, indicating we don't care if they get out of sync and have to reset on their next visit. In this example, that might mean that if a visitor tries to make a comment while offline, the comment could be lost, in theory (in practice, since no one else is editing your comment, it should not get 'left behind' and can merge in just fine).

#### ReadOnly

`ReadOnly` tokens are like `Passive` ones, but they also are denied the ability to submit any operations. They can only read the state, either `Realtime` or `Pull`.
