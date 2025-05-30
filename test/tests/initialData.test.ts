import { createMigration } from '@verdant-web/store';
import { it, expect } from 'vitest';
import v1 from '../client/schemaVersions/v1.js';
import { createTestClient } from '../lib/testClient.js';
import { assert } from '@verdant-web/common';
import { getPersistence } from '../lib/persistence.js';

async function fakeApi() {
	return new Promise<string>((resolve) => {
		setTimeout(() => {
			resolve('hello world');
		}, 200);
	});
}

it('can load initial data before the client opens', async () => {
	const persistence = getPersistence();

	// using a custom v1 migration to create the initial data
	let migrationsInvokedCount = 0;
	const migrations = [
		createMigration(v1, async ({ mutations }) => {
			migrationsInvokedCount++;
			const category = await mutations.categories.put({
				name: 'default',
			});
			const value = await fakeApi();
			await mutations.items.put({
				content: value,
				categoryId: category.id,
			});
		}),
	];

	const client = await createTestClient({
		persistence,
		library: 'test',
		user: 'a',
		migrations,
		// logId: 'A',
	});

	expect(migrationsInvokedCount).toBe(1);

	const category = await client.categories.findOne({
		index: {
			where: 'name',
			equals: 'default',
		},
	}).resolved;
	expect(category).toBeTruthy();
	assert(category);
	expect(category.get('id').length).toBe(7);
	const item = await client.items.findOne({
		index: {
			where: 'categoryId',
			equals: category.get('id'),
		},
	}).resolved;
	expect(item).toBeTruthy();
	assert(item);
	expect(item.get('purchased')).toBe(false);

	// it does not load initial data again
	await client.close();

	const client2 = await createTestClient({
		persistence,
		library: 'test',
		user: 'a',
	});

	expect(client2).toBeDefined();
	expect(migrationsInvokedCount).toBe(1);
});
