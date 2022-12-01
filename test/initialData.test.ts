import { migrate } from '@lo-fi/web';
import { it, expect } from 'vitest';
import v1 from './client/schemaVersions/v1.js';
import { createTestClient } from './lib/testClient.js';

it('can load initial data before the client opens', async () => {
	const indexedDb = new IDBFactory();

	// using a custom v1 migration to create the initial data
	let migrationsInvokedCount = 0;
	const migrations = [
		migrate(v1, async ({ mutations }) => {
			migrationsInvokedCount++;
			const category = await mutations.categories.put({
				name: 'default',
			});
			await mutations.items.put({
				content: 'hello world',
				categoryId: category.id,
			});
		}),
	];

	const client = await createTestClient({
		indexedDb,
		library: 'test',
		user: 'a',
		migrations,
		logId: 'initialData',
	});

	expect(migrationsInvokedCount).toBe(1);

	const category = await client.categories.findOne({
		where: 'name',
		equals: 'default',
	}).resolved;
	expect(category).toBeTruthy();
	expect(category.get('id').length).toBe(7);
	const item = await client.items.findOne({
		where: 'categoryId',
		equals: category.get('id'),
	}).resolved;
	expect(item).toBeTruthy();
	expect(item.get('purchased')).toBe(false);

	// it does not load initial data again
	client.close();

	const client2 = await createTestClient({
		indexedDb,
		library: 'test',
		user: 'a',
	});

	expect(client2).toBeDefined();
	expect(migrationsInvokedCount).toBe(1);
});
