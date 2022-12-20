import { describe, it, expect, vi, MockedFunction } from 'vitest';
import { createTestStorage } from './fixtures/testStorage.js';

describe('batching operations', () => {
	it('should allow multiple runs with manual flush', async () => {
		const storage = await createTestStorage();

		const item = await storage.put('todo', {
			content: 'hello world',
			category: 'general',
			attachments: [
				{
					name: 'thing',
				},
			],
		});

		// disable timeout for manual control
		const batch = storage.batch({ timeout: null });

		batch.run(() => {
			item.set('content', 'hello world 2');
			item.set('category', 'never');
		});

		// fake some async work
		await new Promise((resolve) => setTimeout(resolve, 200));

		batch.run(() => {
			item.set('content', 'hello world 3');
			item.set('category', 'general');
			item.get('attachments').push({ name: 'other thing' });
		});

		await batch.flush();

		expect(item.get('content')).toBe('hello world 3');
		expect(item.get('category')).toBe('general');
		expect(item.get('attachments').length).toBe(2);

		expect(storage.undoHistory.canUndo).toBe(true);

		await storage.undoHistory.undo();

		expect(item.get('content')).toBe('hello world');
		expect(item.get('category')).toBe('general');
		expect(item.get('attachments').length).toBe(1);

		// the next undo will undo the creation
		await storage.undoHistory.undo();
		expect(storage.undoHistory.canUndo).toBe(false);

		expect(item.deleted).toBe(true);
	});
});
