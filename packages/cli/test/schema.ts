import {
	schema,
	StorageAnyFieldSchema,
	StorageArrayFieldSchema,
	StorageMapFieldSchema,
	StorageObjectFieldSchema,
	StorageStringFieldSchema,
} from '@verdant-web/store';

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
		meta: schema.fields.object({
			properties: {
				comment: schema.fields.string(),
			},
			nullable: true,
		}),
		file: schema.fields.file({
			nullable: true,
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

const contentBase = schema.fields.object({
	fields: {},
});

type NestedContentFieldSchema = StorageObjectFieldSchema<{
	type: StorageStringFieldSchema;
	attributes: StorageMapFieldSchema<StorageAnyFieldSchema>;
	content: StorageArrayFieldSchema<NestedContentFieldSchema>;
	text: StorageStringFieldSchema;
}>;

const nestedContent: NestedContentFieldSchema =
	schema.fields.replaceObjectFields(contentBase, {
		type: schema.fields.string(),
		attributes: schema.fields.map({
			values: schema.fields.any(),
		}),
		content: schema.fields.array({
			items: contentBase,
			nullable: true,
		}),
		text: schema.fields.string({ nullable: true }),
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
		content: nestedContent,
	},
	indexes: {
		secondLevelContentText: {
			type: 'string',
			compute: (doc) => doc.content.content[0].text,
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
