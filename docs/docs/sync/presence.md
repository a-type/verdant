---
sidebar_position: 4
---

# Presence & Profiles

Once you're syncing, presence info is available on `client.sync.presence` (where `client` is your instance of Client).

You can get `presence.self`, `presence.peers`, or `presence.everyone`. You can also subscribe to change events: `peerChanged(userId, presence)`, `selfChanged(presence)`, `peersChanged(peers: { [userId]: presence })`. Note that if you did not supply user information on your server and used the example code above, all peers will show up with the same exact identity! If you want to make each peer individual, you need to give them all unique user IDs. You could generate them on your server in-memory if you don't want persistent profiles.

Verdant distinguishes between "replica ID" (i.e. individual device) and "user ID." The intention is to allow one actual person to use multiple devices, but only have one presence which follows them between devices.

To update your presence, use `presence.update`.

## Profiles

Profiles are stored and pulled from the server. A user may not edit their own profile from Verdant. It's a good place to put data you need to trust, like user role or identity.

When initializing sync, you must supply a `defaultProfile` value. That's because presence is available immediately, before sync can connect and retrieve user profiles, so something needs to be there. You can either type your Profile data as `{ /* your server data*/ } | null` and supply `null`, or supply an empty value that makes sense for your data.
