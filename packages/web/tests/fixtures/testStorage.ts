import { createDefaultMigration } from '@lofi/common';
import { IDBFactory } from 'fake-indexeddb';
import { Storage, collection, schema } from '../../src/index.js';

export const todoCollection = collection({
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

const testSchema = schema({
	version: 1,
	collections: {
		todo: todoCollection,
	},
});

export async function createTestStorage() {
	const idb = new IDBFactory();
	const storage = new Storage({
		schema: testSchema,
		indexedDB: idb,
		syncOptions: {
			host: 'none',
		},
		initialPresence: {},
		migrations: [createDefaultMigration(testSchema)],
	});
	await storage.ready;
	return storage;
}
