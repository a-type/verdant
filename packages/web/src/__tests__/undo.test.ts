import { describe, it, expect, vi, MockedFunction } from 'vitest';
import { createTestStorage } from './fixtures/testStorage.js';

describe('undoing operations', () => {
	it('should undo deletes', async () => {
		const storage = await createTestStorage();

		const item = await storage.todos.put({
			content: 'item',
			category: 'general',
			attachments: [
				{
					name: 'thing',
				},
			],
		});

		await storage.todos.delete(item.get('id'));

		expect(await storage.todos.get(item.get('id')).resolved).toBeNull();

		await storage.undoHistory.undo();

		const restored = await storage.todos.get(item.get('id')).resolved;
		expect(restored).toBeDefined();
		expect(restored.get('id')).toBe(item.get('id'));
		expect(restored.get('content')).toBe('item');
		expect(restored.get('category')).toBe('general');
		expect(restored.get('attachments').get(0).get('name')).toBe('thing');
	});

	it('should create batches without undo', async () => {
		const storage = await createTestStorage();

		const item = await storage.todos.put({
			content: 'item',
			category: 'general',
			attachments: [
				{
					name: 'thing',
				},
			],
		});

		item.set('content', 'hello world');
		await storage.entities.flushPatches();

		await storage
			.batch({
				undoable: false,
			})
			.run(() => {
				item.set('content', 'hello world 2');
				item.set('category', 'sticky');
			})
			.flush();

		expect(item.get('content')).toBe('hello world 2');
		expect(item.get('category')).toBe('sticky');

		expect(storage.undoHistory.canUndo).toBe(true);

		await storage.undoHistory.undo();

		expect(item.get('content')).toBe('item');
		// was not undone!
		expect(item.get('category')).toBe('sticky');

		// the next undo will undo the creation
		await storage.undoHistory.undo();
		expect(item.deleted).toBe(true);
	});

	// more definitive undo tests require syncing multiple clients
});
