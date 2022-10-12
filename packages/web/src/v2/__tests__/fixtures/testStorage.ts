import { collection, createDefaultMigration, schema } from '@lo-fi/common';
// @ts-ignore
import { IDBFactory } from 'fake-indexeddb';
import { WebsocketSync } from '../../Sync.js';
import { StorageDescriptor } from '../../index.js';

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

export function createTestStorage() {
	const idb = new IDBFactory();
	const storage = new StorageDescriptor({
		schema: testSchema,
		migrations: [createDefaultMigration(testSchema)],
		indexedDb: idb,
		sync: new WebsocketSync({
			host: 'none',
		}),
		initialPresence: {},
		namespace: 'test',
	}).open();
	return storage;
}
