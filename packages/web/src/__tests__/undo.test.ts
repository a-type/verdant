import { describe, it, expect, vi, MockedFunction } from 'vitest';
import { createTestStorage } from './fixtures/testStorage.js';

describe('undoing operations', () => {
	it('should undo deletes', async () => {
		const storage = await createTestStorage();

		const item = await storage.create('todo', {
			content: 'item',
			category: 'general',
			attachments: [
				{
					name: 'thing',
				},
			],
		});

		await storage.delete('todo', item.get('id'));

		expect(await storage.get('todo', item.get('id')).resolved).toBeNull();

		await storage.undoHistory.undo();

		const restored = await storage.get('todo', item.get('id')).resolved;
		expect(restored).toBeDefined();
		expect(restored.get('id')).toBe(item.get('id'));
		expect(restored.get('content')).toBe('item');
		expect(restored.get('category')).toBe('general');
		expect(restored.get('attachments').get(0).get('name')).toBe('thing');
	});

	// more definitive undo tests require syncing multiple clients
});
