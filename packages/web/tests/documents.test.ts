import cuid from 'cuid';
import { describe, it, expect, vi, MockedFunction } from 'vitest';
import { subscribe } from '../src/index.js';
import { createTestStorage } from './fixtures/testStorage.js';

async function waitForStoragePropagation(mock: MockedFunction<any>) {
	await new Promise<void>((resolve, reject) => {
		// timeout after 3s waiting
		const timeout = setTimeout(
			() => reject(new Error('Waiting for storage change timed out')),
			3000,
		);
		const interval = setInterval(() => {
			if (mock.mock.calls.length > 0) {
				clearInterval(interval);
				clearTimeout(timeout);
				resolve();
			}
		}, 0);
	});
}

describe('storage documents', () => {
	it('should have a stable identity across different queries', async () => {
		const storage = await createTestStorage();

		const todos = storage.get('todo');

		const item1 = await todos.create({
			id: cuid(),
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
		});
		const item2 = await todos.create({
			id: cuid(),
			content: 'item 2',
			done: true,
			tags: [],
			category: 'general',
		});

		const singleItemQuery = todos.get(item1.id);
		const allItemsQuery = todos.getAll();

		const singleItemResult = await singleItemQuery.resolved;
		const allItemsResult = await allItemsQuery.resolved;
		const allItemsReferenceToItem1 = allItemsResult.find(
			(item) => item.id === item1.id,
		);
		expect(singleItemResult).toEqual(allItemsReferenceToItem1);
	});

	it('should notify about changes', async () => {
		const storage = await createTestStorage();

		const todos = storage.get('todo');

		const item1 = await todos.create({
			id: cuid(),
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
		});

		const liveItem1 = await todos.get(item1.id).resolved;
		const callback = vi.fn();
		subscribe(liveItem1!, callback);

		await todos.update(item1.id, {
			content: 'item 1 updated',
			done: true,
		});

		expect(callback).toBeCalledTimes(1);
		expect(callback).toBeCalledWith({
			id: item1.id,
			content: 'item 1 updated',
			done: true,
			tags: [],
			category: 'general',
		});
	});

	it('should expose a mutator to update properties', async () => {
		const storage = await createTestStorage();

		const todos = storage.get('todo');

		const item1 = await todos.create({
			id: cuid(),
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
		});

		const liveItem1 = await todos.get(item1.id).resolved;
		const callback = vi.fn();
		subscribe(liveItem1!, callback);

		liveItem1!.$update({
			content: 'item 1 updated',
			done: true,
		});

		// fields are immediately updated
		expect(liveItem1!.done).toBe(true);
		expect(liveItem1!.content).toBe('item 1 updated');

		await waitForStoragePropagation(callback);

		expect(callback).toBeCalledTimes(1);
		expect(callback).toBeCalledWith({
			id: item1.id,
			content: 'item 1 updated',
			done: true,
			tags: [],
			category: 'general',
		});
	});

	it('should expose array mutators on nested arrays', async () => {
		const storage = await createTestStorage();

		const todos = storage.get('todo');

		const item1 = await todos.create({
			id: cuid(),
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
		});

		const liveItem1 = await todos.get(item1.id).resolved;
		const callback = vi.fn();
		subscribe(liveItem1!, callback);

		liveItem1!.tags.$push('tag 1');
		liveItem1!.tags.$push('tag 2');
		liveItem1!.tags.$push('tag 3');
		liveItem1!.tags.$move(1, 2);

		// fields are immediately updated
		expect(liveItem1!.tags[0]).toEqual('tag 1');
		expect(liveItem1!.tags[1]).toEqual('tag 3');
		expect(liveItem1!.tags[2]).toEqual('tag 2');

		await waitForStoragePropagation(callback);

		expect(callback).toBeCalledTimes(1);
		expect(callback).toBeCalledWith({
			id: item1.id,
			content: 'item 1',
			done: false,
			tags: ['tag 1', 'tag 3', 'tag 2'],
			category: 'general',
		});
	});

	it('should allow assignment for mutation on objects', async () => {
		const storage = await createTestStorage();

		const todos = storage.get('todo');

		const item1 = await todos.create({
			id: cuid(),
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
		});

		const liveItem1 = await todos.get(item1.id).resolved;
		const callback = vi.fn();
		subscribe(liveItem1!, callback);

		liveItem1!.done = true;

		expect(liveItem1!.done).toBe(true);

		await waitForStoragePropagation(callback);

		expect(callback).toBeCalledTimes(1);
		expect(callback).toBeCalledWith({
			id: item1.id,
			content: 'item 1',
			done: true,
			tags: [],
			category: 'general',
		});
	});
});
