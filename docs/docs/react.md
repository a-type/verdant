---
sidebar_position: 5
---

# React

Verdant has React hooks generation. To enable it, pass `--react` to the [CLI](./local-storage/generate-client). A new module `react.js` will be emitted in the output directory. It exports one function, `createHooks`. Call it to construct hooks for your Verdant storage.

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

It will generate named hooks based on each document collection, plus a few utility hooks. For example, if you have the collection `todoItems`, you will get these hooks:

- `useAllTodoItems`: pass an index query to filter the list of returned items.
- `useOneTodoItem`: pass an index query to filter the list of returned items, and only take the first match.
- `useTodoItem`: Retrieves one document. You pass in an id.
- `useWatch`: pass a "live document" to this and the component will update when that document changes. An unfortunate necessity of the WIP reactive object approach.
- `useSelf`: returns your own presence.
- `usePeerIds`: returns an array of string user IDs of peers. Good for iterating over peers to render them.
- `usePeer`: pass a peer's user ID to retrieve their presence.
- `useViewId`: pass a unique ID for a 'view' and the current replica's presence will be marked as 'on' that view.
- `useViewPeers`: returns all peers on the same view as the current replica.
- `useField`: pass an entity and a key, and this returns a bunch of useful stuff for working with a particular field. See below.
- `useSyncStatus`: returns a boolean indicating whether sync is active or not.

## Context

In addition to the generated hooks you also get a `Provider`. Pass your `ClientDescriptor` instance to `value` to provide a client for your hooks to use.

By using a Context in this way, you can instantiate different clients for the same schema and change the library your app is interacting with. See the advanced usage below.

## Suspense

The hooks use Suspense so that you don't have to write loading state conditional code in your components. All hooks return data directly. If the data is not ready, they suspend.

Wrap your app in a `<Suspense>` to handle this. You can create multiple layers of Suspense to handle loading more granularly.

The `hooks.Provider` component has a Suspense boundary built-in as a final fallback, to prevent state loss further up the tree when loading. You can customize the fallback rendering by passing a `suspenseFallback` prop to `hooks.Provider`.

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

## Usage examples

### Basic

```tsx
function Todos() {
	const items = hooks.useAllTodoItems({
		index: {
			where: 'indexableDone',
			equals: 'false',
		},
	});

	return (
		<ul>
			{items.map((item) => (
				<li key={item.get('id')}>{item.get('content')}</li>
			))}
		</ul>
	);
}

function App() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<hooks.Provider value={clientDescriptor}>
				<Todos />
			</hooks.Provider>
		</Suspense>
	);
}
```

### `useField` hook

The `useField` hook provides some convenient tools for changing single entity fields.

The hook returns an object with the following properties:

- `value`: the live value of the field
- `setValue`: a setter to update the field
- `inputProps`: props you can spread directly to an `input` or `textarea` to wire it up
- `presence`: data about other replicas interacting with the field

The hook automatically interprets boolean field values for use with checkbox inputs. You don't even need to pass `type="checkbox"`, just spread `inputProps`.

It also tracks presence on fields, starting with `blur`. The local replica will have its presence marked as editing the field for up to a minute after any modification. This presence is accessible to other replicas via the same `useField` presence data, so you can show avatars or disable editing, or whatever.

### Advanced: changing client libraries

```tsx
function Todos() {
	const items = hooks.useAllTodoItems({
		index: {
			where: 'indexableDone',
			equals: 'false',
		},
	});

	return (
		<ul>
			{items.map((item) => (
				<li key={item.get('id')}>{item.get('content')}</li>
			))}
		</ul>
	);
}

function App({ libraryId }: { libraryId: string }) {
	/**
	 * When the libraryId prop changes, we create a new client
	 * which authenticates against that library. The auth endpoint
	 * here would need to read that query parameter and create
	 * a token for the client to access the library.
	 */
	const descriptor = useMemo(
		() =>
			new ClientDescriptor({
				namespace: libraryId,
				migrations,
				sync: {
					authEndpoint: `http://localhost:3001/auth/sync?library=${libraryId}`,
					initialPresence: {},
					// start sync when ready - useful if you want to sync
					// in this setup. if you don't want to sync, that's fine too!
					autoStart: true,
				},
			}),
		[libraryId],
	);

	useEffect(() => {
		// when the client changes, shut it down.
		return () => {
			descriptor.close();
		};
	}, [descriptor]);

	return (
		<Suspense fallback={<div>Loading...</div>}>
			<hooks.Provider value={clientDescriptor}>
				<Todos />
			</hooks.Provider>
		</Suspense>
	);
}
```
