import { collection, schema } from '@lo-fi/common';

export const todo = collection({
	name: 'todo',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
			default: () => Math.random().toString(36).slice(2, 9),
		},
		content: {
			type: 'string',
			indexed: true,
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
			nullable: true,
		},
		attachments: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
					},
					test: {
						type: 'number',
						default: 1,
					},
				},
			},
		},
	},
	synthetics: {
		example: {
			type: 'string',
			compute: (doc) => doc.content,
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

export const person = collection({
	name: 'person',
	pluralName: 'people',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
			default: () => Math.random().toString(36).slice(2, 9),
		},
		name: {
			type: 'string',
			indexed: true,
		},
		posts: {
			type: 'array',
			items: {
				type: 'string',
			},
		},
	},
});

export default schema({
	version: 1,
	collections: {
		todos: todo,
		people: person,
	},
});
