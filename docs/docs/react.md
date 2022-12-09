---
sidebar_position: 5
---

# React

lo-fi has React hooks generation. To enable it, pass `--react` to the [CLI](./local-storage/generate-client). A new module `react.js` will be emitted in the output directory. It exports one function, `createHooks`. Call it to construct hooks for your lo-fi storage.

```ts
import { ClientDescriptor, ServerSync } from './client/index.js';
import { createHooks } from './client/react.js';
import migrations from './migrations.js';

const clientDesc = new ClientDescriptor({
	namespace: 'todos',
	migrations,
	sync: {
		authEndpoint: 'https://your.server/auth/lofi',
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
- `useSyncStatus`: returns a boolean indicating whether sync is active or not.

## Context

In addition to the generated hooks you also get a `Provider`. Pass your `ClientDescriptor` instance to `value` to provide a client for your hooks to use.

By using a Context in this way, you can instantiate different clients for the same schema and change the library your app is interacting with. See the advanced usage below.

## Suspense

The hooks use Suspense so that you don't have to write loading state conditional code in your components. All hooks return data directly. If the data is not ready, they suspend.

Wrap your app in a `<Suspense>` to handle this. You can create multiple layers of Suspense to handle loading more granularly.

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
		<hooks.Provider value={clientDescriptor}>
			<Todos />
		</hooks.Provider>
	);
}
```

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
	const [clientDescriptor, setClientDescriptor] =
		useState<ClientDescriptor>(null);
	useEffect(() => {
		const descriptor = new ClientDescriptor({
			namespace: libraryId,
			migrations,
			sync: {
				authEndpoint: `http://localhost:3001/auth/lofi?library=${libraryId}`,
				initialPresence: {},
				// start sync when ready - useful if you want to sync
				// in this setup. if you don't want to sync, that's fine too!
				autoStart: true,
			},
		});
		// set our state
		setClientDescriptor(descriptor);
		// when the client changes, shut it down.
		return () => {
			descriptor.close();
		};
	}, [libraryId]);

	if (!clientDescriptor) {
		return null;
	}

	return (
		<hooks.Provider value={clientDescriptor}>
			<Todos />
		</hooks.Provider>
	);
}
```
