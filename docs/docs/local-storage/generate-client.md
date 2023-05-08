---
sidebar_position: 2
---

# Generating the client code

Using your [schema](./schema), you can generate your typed client code using Verdant's CLI.

```
> npm i --dev @verdant-web/cli

> verdant --schema src/stores/todos/schema.ts --output src/stores/todos/client --react
```

The CLI takes `schema` (the path to your schema TS file), `output` (the directory to output generated code), and `--react` (optional, generates React hooks to query your data).

> **Important:** right now the input schema format for the CLI is quite strict. Ensure your schema is structured exactly the same as the one in [the schema docs](./schema), particularly:
>
> - `collection` and `schema` are used to wrap all definitions
> - It has a default export of the schema itself
> - All collections are defined separately
> - Collection key/values are specified with the verbose `todoItems: todoItems` syntax, not shorthand
>
> Bear with as I get through the backlog of improvements to make this less rigid!

Now you can import your client from the output directory and construct its descriptor:

```ts
import { ClientDescriptor } from './client/index.js';
// see next section!
import migrations from './migrations.js';

const clientDesc = new ClientDescriptor({
	namespace: 'todos',
	migrations,
});

clientDesc.open().then((client) => {
	client.todoItems.put({
		id: '1',
		details: 'Create a Verdant client',
		done: true,
	});
});
```

Client startup is asynchronous, but you can access metadata on StorageDescriptor or pass it around to anything which needs storage context synchronously. Synchronous code which will need access to the same Storage instance can await `StorageDescriptor.open()` individually; they will all get the same final instance.

If you are building in React, be sure to pass `--react` to the CLI and see the [docs](#react) on how to use it, since the built-in React support effectively hides the async waits for a much better DX!

But before you can use the code above, you need to create your first migration.
