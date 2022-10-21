# lo-fi code generator CLI

## Generate a client from schema

Beginning with a schema file like this:

```ts
const todoCollection = collection({
	name: 'todo',
	primaryKey: 'id',
	fields: {
		id: { type: 'string', indexed: true, unique: true },
		content: {
			type: 'string',
			indexed: false,
			unique: false,
		},
		done: {
			type: 'boolean',
		},
		tags: {
			type: 'array',
			items: {
				type: 'string',
			},
		},
		category: {
			type: 'string',
		},
		attachments: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
					},
				},
			},
		},
	},
	synthetics: {
		example: {
			type: 'string',
			compute: (doc) => doc.content,
			unique: false,
		},
	},
	compounds: {
		tagsSortedByDone: {
			of: ['tags', 'done'],
		},
		categorySortedByDone: {
			of: ['category', 'done'],
		},
	},
});

export default schema({
	version: 1,
	collections: {
		todo: todoCollection,
	},
});
```

Point the CLI to the location of your schema file and give it an output directory path to create the client module in.
