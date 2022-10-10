import cuid from 'cuid';
import { describe, it, expect, vi, MockedFunction } from 'vitest';
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
	it('should have a stable identity across different queries when subscribed', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.create('todo', {
			id: cuid(),
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
		});
		await storage.create('todo', {
			id: cuid(),
			content: 'item 2',
			done: true,
			tags: [],
			category: 'general',
		});

		const singleItemQuery = storage.queryMaker.get('todo', item1.get('id'));
		const singleItemResult = await singleItemQuery.resolved;
		expect(singleItemResult).toBeTruthy();
		singleItemResult.subscribe('change', vi.fn());

		const allItemsQuery = storage.queryMaker.findAll('todo');
		const allItemsResult = await allItemsQuery.resolved;
		const allItemsReferenceToItem1 = allItemsResult.find(
			(item) => item.get('id') === item1.get('id'),
		);
		expect(singleItemResult).toBe(allItemsReferenceToItem1);
	});

	it('should immediately reflect mutations', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.create('todo', {
			id: cuid(),
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
		});

		item1.set('done', true);
		expect(item1.get('done')).toBe(true);
	});

	it('should notify about changes', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.create('todo', {
			id: cuid(),
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
		});

		const liveItem1 = await storage.queryMaker.get('todo', item1.get('id'))
			.resolved;
		expect(liveItem1).toBeTruthy();
		const callback = vi.fn();
		liveItem1.subscribe('change', callback);

		liveItem1.set('done', true);
		liveItem1.set('content', 'item 1 updated');

		await waitForStoragePropagation(callback);

		// only 1 callback - changes are batched.
		// expect(callback).toBeCalledTimes(1); // FIXME: called twice, once for immediate in-memory change and once after propagation. can this be 1?
		expect(liveItem1.getSnapshot()).toEqual({
			id: liveItem1.get('id'),
			content: 'item 1 updated',
			done: true,
			tags: [],
			category: 'general',
		});
	});

	it('should expose array mutators on nested arrays', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.create('todo', {
			id: cuid(),
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
		});

		const callback = vi.fn();
		item1.subscribe('change', callback);

		item1.get('tags').push('tag 1');
		item1.get('tags').push('tag 2');
		item1.get('tags').push('tag 3');
		item1.get('tags').move(1, 2);

		// fields are immediately updated
		expect(item1.get('tags').get(0)).toEqual('tag 1');
		expect(item1.get('tags').get(1)).toEqual('tag 3');
		expect(item1.get('tags').get(2)).toEqual('tag 2');

		await waitForStoragePropagation(callback);

		expect(callback).toBeCalledTimes(1);
		expect(item1.getSnapshot()).toEqual({
			id: item1.get('id'),
			content: 'item 1',
			done: false,
			tags: ['tag 1', 'tag 3', 'tag 2'],
			category: 'general',
		});
	});
});
