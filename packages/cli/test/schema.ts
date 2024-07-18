import { schema } from '@verdant-web/store';

export const todo = schema.collection({
	name: 'todo',
	primaryKey: 'id',
	fields: {
		id: schema.fields.id(),
		content: schema.fields.string({
			default: '',
			documentation: 'The content of the todo item',
		}),
		done: schema.fields.boolean({
			documentation: 'Whether the todo item is done',
		}),
		tags: schema.fields.array({
			items: {
				type: 'string',
				options: ['work', 'home', 'other'],
			},
			documentation: 'Attach tags to an item to categorize it',
		}),
		category: schema.fields.string({
			nullable: true,
		}),
		attachments: schema.fields.array({
			items: schema.fields.object({
				properties: {
					name: schema.fields.string(),
					test: schema.fields.number({
						default: 1,
					}),
				},
			}),
		}),
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

export const person = schema.collection({
	name: 'person',
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

export const post = schema.collection({
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
	version: 1,
	collections: {
		todos: todo,
		people: person,
		posts: post,
	},
});
