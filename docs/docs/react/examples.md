---
sidebar_position: 10
---

# Usage examples

## Basic

```tsx
function Todos() {
	const items = hooks.useAllTodoItems({
		index: {
			where: 'indexableDone',
			equals: 'false',
		},
	});

	const client = hooks.useClient();

	return (
		<div>
			<ul>
				{items.map((item) => (
					<li key={item.get('id')}>{item.get('content')}</li>
				))}
			</ul>
			<button
				onClick={() => {
					client.todoItems.put({ content: '' });
				}}
			>
				Add
			</button>
		</div>
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

## Advanced: changing client libraries

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
