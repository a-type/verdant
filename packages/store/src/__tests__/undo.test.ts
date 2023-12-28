import { assert } from '@verdant-web/common';
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
		const itemId = item.get('id');

		await storage.todos.delete(itemId);

		expect(await storage.todos.get(itemId).resolved).toBeNull();

		await storage.undoHistory.undo();

		// the entity should be restored now
		// this should not throw
		item.get('id');

		const restored = await storage.todos.get(itemId).resolved;
		expect(restored).toBeTruthy();
		assert(!!restored);
		expect(restored.get('id')).toBe(itemId);
		expect(restored.get('content')).toBe('item');
		expect(restored.get('category')).toBe('general');
		expect(restored.get('attachments').get(0).get('name')).toBe('thing');
	});

	it('should undo field deletes', async () => {
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

		item.subscribe('change', () => {});

		item.get('attachments').delete(0);

		await storage.entities.flushAllBatches();

		expect(item.get('attachments').length).toBe(0);

		await storage.undoHistory.undo();

		expect(item.get('attachments').length).toBe(1);
		expect(item.get('attachments').get(0).get('name')).toBe('thing');
	}, 10000);

	it('should create batches without undo', async () => {
		const storage = await createTestStorage({
			log: console.log,
		});

		const item = await storage.todos.put({
			content: 'item',
			category: 'general',
			attachments: [
				{
					name: 'thing',
				},
			],
		});

		await storage
			.batch()
			.run(() => {
				item.set('content', 'hello world');
			})
			.commit();

		await storage
			.batch({
				undoable: false,
			})
			.run(() => {
				item.set('content', 'hello world 2');
				item.set('category', 'sticky');
			})
			.commit();

		expect(item.get('content')).toBe('hello world 2');
		expect(item.get('category')).toBe('sticky');

		expect(storage.undoHistory.canUndo).toBe(true);

		await storage.undoHistory.undo();

		expect(item.get('content')).toBe('item');
		// was not undone!
		expect(item.get('category')).toBe('sticky');

		// the next undo will undo the creation
		expect(storage.undoHistory.canUndo).toBe(true);
		await storage.undoHistory.undo();
		expect(item.deleted).toBe(true);
	});

	// more definitive undo tests require syncing multiple clients
});
