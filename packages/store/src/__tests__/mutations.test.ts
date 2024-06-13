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

	describe('on entities', () => {
		it('should allow them to delete themselves (root level)', async () => {
			const client = await createTestStorage();

			const itemA = await client.todos.put({
				id: '1',
				content: 'itemA',
				category: 'test',
			});

			await itemA.deleteSelf();

			const itemAExists = await client.todos.get('1').resolved;

			expect(itemAExists).toBeNull();
		});

		it('should allow them to delete themselves (nested array)', async () => {
			const client = await createTestStorage();

			const itemA = await client.todos.put({
				id: '1',
				content: 'itemA',
				category: 'test',
				attachments: [
					{
						name: 'foo',
					},
				],
			});

			itemA.get('attachments').get(0).deleteSelf();

			expect(itemA.get('attachments').length).toBe(0);
		});

		it('should allow them to delete themselves (nested map)', async () => {
			const client = await createTestStorage();

			const weird = await client.weirds.put({
				objectMap: {
					foo: {
						content: 'bar',
					},
				},
			});

			weird.get('objectMap').get('foo').deleteSelf();

			expect(weird.get('objectMap').size).toBe(0);
		});
	});
});
