---
sidebar_position: 4
---

# React

lo-fi has React hooks generation. To enable it, pass `--react` to the [CLI](./local-storage/generate-client). A new module `react.js` will be emitted in the output directory. It exports one function, `createHooks`. Pass your ClientDescriptor instance into that.

```ts
import { ClientDescriptor, ServerSync } from './client/index.js';
import { createHooks } from './client/react.js';
import schema from './schema.js';
import migrations from './migrations.js';

const clientDesc = new ClientDescriptor({
	namespace: 'todos',
	schema,
	migrations,
	sync: new ServerSync({
		host: 'https://your.server/lofi',
	}),
	initialPresence: {
		emoji: '',
	},
});

const hooks = createHooks(clientDesc);
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

As you can see from some of that, React hooks are pretty WIP still.

## Suspense

The hooks use Suspense so that you don't have to write loading state conditional code in your components. All hooks return data directly. If the data is not ready, they suspend.

Wrap your app in a `<Suspense>` to handle this. You can create multiple layers of Suspense to handle loading more granularly.

## Usage example

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
```
