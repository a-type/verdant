import { createMigration, schema } from '@verdant-web/common';
// @ts-ignore
import { IDBFactory } from 'fake-indexeddb';
import { Client, ClientWithCollections, IdbPersistence } from '../../index.js';

const test = schema.fields.object({
	fields: {
		foo: schema.fields.string(),
	},
});

export const todoCollection = schema.collection({
	name: 'todo',
	primaryKey: 'id',
	fields: {
		id: schema.fields.string({
			default: () => Math.random().toString(36).slice(2, 9),
		}),
		content: schema.fields.string(),
		done: schema.fields.boolean({
			default: false,
		}),
		tags: schema.fields.array({
			items: schema.fields.string(),
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
		content: {
			field: 'content',
		},
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

export const weirdCollection = schema.collection({
	name: 'weird',
	primaryKey: 'id',
	fields: {
		id: schema.fields.string({
			default: () => Math.random().toString(36).slice(2, 9),
		}),
		weird: schema.fields.any(),
		map: schema.fields.map({
			values: schema.fields.string(),
		}),
		fileList: schema.fields.array({
			items: schema.fields.file(),
		}),
		objectMap: schema.fields.map({
			values: schema.fields.object({
				properties: {
					content: schema.fields.string(),
				},
			}),
		}),
		arrayMap: schema.fields.map({
			values: schema.fields.array({
				items: schema.fields.string(),
			}),
		}),
		file: schema.fields.file({
			nullable: true,
		}),
	},
});

export const testSchema = schema({
	version: 1,
	collections: {
		todos: todoCollection,
		weirds: weirdCollection,
	},
});

export function createTestStorage({
	idb = new IDBFactory(),
	disableRebasing = false,
	log,
}: {
	idb?: IDBFactory;
	disableRebasing?: boolean;
	log?: (...args: any[]) => void;
} = {}) {
	const storage = new Client({
		schema: testSchema,
		migrations: [createMigration<{}>(testSchema)],
		namespace: 'test',
		disableRebasing,
		oldSchemas: [testSchema],
		log,
		persistence: new IdbPersistence(idb),
	});
	return storage as ClientWithCollections;
}
