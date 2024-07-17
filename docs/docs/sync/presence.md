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

## Views and Fields

Verdant has some presence concepts built-in for convenience. So far, this includes _views_ and _fields_.

### Views (experimental)

A "view" is a rough concept (because not all apps are structured with pages, etc). All you need for a view is a unique ID. For React users, pass the view ID to the `useViewId` hook to auto-register the user's presence in that view. The most recently rendered view with this hook will 'win,' and a user can only register one view at a time for presence. When unmounted, the hook will reset to `undefined`.

> Using nested views is not recommended. I would restrict usage to top-level, exclusive 'routes' or similar concepts.

Use the `useViewPeers` hook to see which of your online peers are on the same view.

### Fields

A "field" is similar to a "view" in that it's really just an ID. Fields are _roughly_ mapped to actual entity fields in Verdant, but you _could_ use this feature for anything really.

Like views, each replica has one registered field in presence. However, unlike views, it expires after a minute.

Where field presence really works best is in a tighter framework integration, like Verdant's own [React bindings](/react#useField-hook)
