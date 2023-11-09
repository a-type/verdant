import { collection, schema } from '@verdant-web/store';

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
			default: '',
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
	indexes: {
		example: {
			type: 'string',
			compute: (doc) => doc.content,
		},
		content: {
			field: 'content',
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

export const post = collection({
	name: 'post',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
			default: () => Math.random().toString(36).slice(2, 9),
		},
		title: {
			type: 'string',
			indexed: true,
		},
		content: {
			type: 'string',
		},
	},
});

export default schema({
	version: 4,
	collections: {
		todos: todo,
		people: person,
		posts: post,
	},
});
