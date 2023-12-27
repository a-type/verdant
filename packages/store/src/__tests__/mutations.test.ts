import { describe, expect, it } from 'vitest';
import { createTestStorage } from './fixtures/testStorage.js';

describe('mutations', () => {
	it('should only delete entities related to specified id', async () => {
		const client = await createTestStorage({
			log: console.debug,
		});

		const itemA = await client.todos.put({
			id: '1',
			content: 'itemA',
			category: 'test',
		});

		const itemB = await client.todos.put({
			id: '11',
			content: 'itemB',
			category: 'test',
		});

		await client.todos.delete('1');

		const itemAExists = await client.todos.get('1').resolved;
		const itemBExists = await client.todos.get('11').resolved;

		expect(itemAExists).toBeNull();
		expect(itemBExists === itemB).toBe(true);
	});

	// double check - this time with rebasing disabled, meaning
	// the underlying system will check only operations for possible OIDs
	// to delete.
	it('should only delete entities related to specified id (rebasing disabled)', async () => {
		const client = await createTestStorage({ disableRebasing: true });

		const itemA = await client.todos.put({
			id: '1',
			content: 'itemA',
			category: 'test',
		});

		const itemB = await client.todos.put({
			id: '11',
			content: 'itemB',
			category: 'test',
		});

		await client.todos.delete('1');

		const itemAExists = await client.todos.get('1').resolved;
		const itemBExists = await client.todos.get('11').resolved;

		expect(itemAExists).toBeNull();
		expect(itemBExists === itemB).toBe(true);
	});
});
