import { it, expect } from 'vitest';
import { createTestClient } from './lib/testClient.js';

it('can load initial data before the client opens', async () => {
	const indexedDb = new IDBFactory();

	const client = await createTestClient({
		indexedDb,
		library: 'test',
		user: 'a',
		loadInitialData: async (client) => {
			const category = await client.categories.put({
				name: 'default',
			});
			await client.items.put({
				content: 'hello world',
				categoryId: category.get('id'),
			});
		},
	});

	const category = await client.categories.findOne({
		where: 'name',
		equals: 'default',
	}).resolved;
	expect(category).toBeDefined();
	const item = await client.items.findOne({
		where: 'categoryId',
		equals: category.get('id'),
	}).resolved;
	expect(item).toBeDefined();

	// it does not load initial data again
	client.close();

	const client2 = await createTestClient({
		indexedDb,
		library: 'test',
		user: 'a',
		loadInitialData: async (client) => {
			throw new Error('should not be called');
		},
	});

	expect(client2).toBeDefined();
});
