---
sidebar_position: 1
---

# Getting started with React

Verdant has React hooks generation. To enable it, pass `--react` to the [CLI](../local-storage/generate-client). A new module `react.js` will be emitted in the output directory. It exports one function, `createHooks`. Call it to construct hooks for your Verdant storage.

```ts
import { ClientDescriptor, ServerSync } from './client/index.js';
import { createHooks } from './client/react.js';
import migrations from './migrations.js';

const clientDesc = new ClientDescriptor({
	namespace: 'todos',
	migrations,
	sync: {
		authEndpoint: 'https://your.server/auth/sync',
		initialPresence: {
			emoji: '',
		},
	},
});

// export your generated hooks
export const hooks = createHooks();
```

It will generate named hooks based on each document collection, plus a few utility hooks. To see what collection query hooks are generated, see [Query hooks](./queries.md). Other general hooks are as follows:

- `useClient`: returns the Verdant Client instance. The best way to access the Client for document `put` and `delete`s. Suspends until the Client is ready.
- `useWatch`: pass a "live document" to this and the component will update when that document changes.
- `useOnChange`: similar to `useWatch`, but rather than re-rendering the component for you with new data, you instead pass a callback which is invoked. Does not re-render the component unless you update component state in the callback. You can use this to make imperative, outside-React changes if you want.
- `useSelf`: returns your own presence.
- `usePeerIds`: returns an array of string user IDs of peers. Good for iterating over peers to render them.
- `usePeer`: pass a peer's user ID to retrieve their presence.
- `useViewId`: pass a unique ID for a 'view' and the current replica's presence will be marked as 'on' that view.
- `useViewPeers`: returns all peers on the same view as the current replica.
- `useField`: pass an entity and a key, and this returns a bunch of useful stuff for working with a particular field. See below.
- `useSyncStatus`: returns a boolean indicating whether sync is active or not.
- `useUndo`: returns a function you can call to pop an item from the undo stack.
- `useRedo`: returns a function you can call top pop an item from the redo stack.
- `useCanUndo`: Returns `true` or `false` based on whether an item is available on the undo stack.
- `useCanRedo`: Returns `true` or `false` based on whether an item is available on the redo stack.
- `useUnsuspendedClient`: returns either a Client or `null`, if the Client has not yet initialized.

## Context

In addition to the generated hooks you also get a `Provider`. Pass your `ClientDescriptor` instance to `value` to provide a client for your hooks to use.

By using a Context in this way, you can instantiate different clients for the same schema and change the library your app is interacting with. See the advanced usage below.

## Typing of presence

By default, create hooks have `any` types for all presence values. To synchronize presence typings with your main client, provide the same Presence and Profile typings for both:

```ts
export interface Presence {
	emoji: string;
}

export interface Profile {
	// any data you may have put in profiles on the server
}

const clientDesc = new ClientDescriptor<Presence, Profile>({
	// ...
});

// for React support, also pass the typing arguments to createHooks
export const hooks = createHooks<Presence, Profile>();
```

## Custom mutation hooks

To create reusable hooks which utilize the client, you can chain `.withMutations` from the created hooks object and add your own custom hooks which take `client` as a first parameter.

This can help encapsulate custom behaviors, instead of ad-hoc calling `useClient()` and re-implementing them in multiple components.

Of course, you could do this in your own code; this is purely for convenience.

```ts
const hooks = createHooks<Presence, Profile>().withMutations({
	useAddItem: (client) => {
		return useCallback(
			async (init: ItemInit) => {
				const item = await client.items.put(init, { undoable: false });
				analytics.reportItemCreated(item);
				return item;
			},
			[client],
		);
	},
});
```
