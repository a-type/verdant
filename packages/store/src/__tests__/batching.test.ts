import { describe, it, expect, vi } from 'vitest';
import { createTestStorage } from './fixtures/testStorage.js';
import { Entity } from '../entities/Entity.js';

describe('batching operations', () => {
	it('should allow multiple runs with manual flush', async () => {
		const storage = await createTestStorage();

		const item: Entity = await storage.todos.put({
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
			// changes are applied synchronously
			expect(item.get('content')).toBe('hello world 2');
			item.set('category', 'never');
		});

		// fake some async work
		await new Promise((resolve) => setTimeout(resolve, 200));

		batch.run(() => {
			item.set('content', 'hello world 3');
			item.set('category', 'general');
			item.get('attachments').push({ name: 'other thing' });
		});

		await batch.commit();

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

	it('should overwrite superseded sequential set operations on the same key where applicable', async () => {
		const onOperation = vi.fn();
		const client = await createTestStorage();
		client.subscribe('operation', onOperation);

		const item = await client.todos.put({
			content: 'hello world',
			category: 'general',
		});
		onOperation.mockReset();

		item.set('content', 'hello world 2');
		item.set('content', 'hello world 3');
		item.set('content', 'hello world 4');

		await client.batch().commit();

		expect(item.get('content')).toBe('hello world 4');
		expect(onOperation.mock.calls.length).toBe(1);
		expect(onOperation).toHaveBeenCalledWith({
			oid: item.uid,
			timestamp: expect.anything(),
			isLocal: true,
			data: {
				op: 'set',
				name: 'content',
				value: 'hello world 4',
			},
		});
	});

	it('should not interfere with other fields when superseding', async () => {
		const onOperation = vi.fn();
		const client = await createTestStorage();
		client.subscribe('operation', onOperation);

		const item = await client.todos.put({
			content: 'hello world',
			category: 'general',
		});
		onOperation.mockReset();

		item.set('content', 'hello world 2');
		item.set('category', 'never');
		item.set('content', 'hello world 3');
		item.set('category', 'general');

		await client.batch().commit();

		expect(item.get('content')).toBe('hello world 3');
		expect(item.get('category')).toBe('general');
		expect(onOperation.mock.calls.length).toBe(2);

		expect(onOperation).toHaveBeenCalledWith({
			oid: item.uid,
			timestamp: expect.anything(),
			isLocal: true,
			data: {
				op: 'set',
				name: 'content',
				value: 'hello world 3',
			},
		});

		expect(onOperation).toHaveBeenCalledWith({
			oid: item.uid,
			timestamp: expect.anything(),
			isLocal: true,
			data: {
				op: 'set',
				name: 'category',
				value: 'general',
			},
		});
	});
});
