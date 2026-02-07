import { assert } from '@verdant-web/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClientWithCollections } from '../index.js';
import { createTestStorage } from './fixtures/testStorage.js';

async function addTestingItems(storage: ClientWithCollections) {
	let items = [];

	for (const item of [
		{
			id: '1',
			content: 'item 1',
			done: false,
			tags: ['a'],
			category: 'general',
		},
		{
			id: '2',
			content: 'item 2',
			done: true,
			tags: ['a', 'b'],
			category: 'general',
		},
		{
			id: '3',
			content: 'item 3',
			done: false,
			tags: ['b', 'c'],
			category: 'general',
		},
		{
			id: '4',
			content: 'something else',
			done: true,
			tags: [],
			category: 'specific',
		},
		{
			id: '5',
			content: 'item 5',
			done: false,
			tags: ['a', 'b'],
			category: 'specific',
		},
		{
			id: '6',
			content: 'not an item!',
			done: true,
			tags: ['a'],
			category: 'specific',
		},
	]) {
		items.push(await storage.todos.put(item));
	}
	return items;
}

afterEach(() => {
	vi.useRealTimers();
});

describe('storage queries', () => {
	it('can query synthetic indexes', async () => {
		const storage = createTestStorage();

		const items = await addTestingItems(storage);

		const query = storage.todos.findAll({
			index: {
				where: 'example',
				equals: 'something else',
			},
		});
		const results = await query.resolved;

		expect(results.map((i: any) => i.get('id'))).toEqual([items[3].get('id')]);
	});

	it('can query simple compound indexes by match and order', async () => {
		const storage = createTestStorage();

		const items = await addTestingItems(storage);

		const query = storage.todos.findAll({
			index: {
				where: 'categorySortedByDone',
				match: {
					category: 'general',
				},
				order: 'asc',
			},
		});
		const results = await query.resolved;

		expect(results.map((i: any) => i.get('id'))).toEqual([
			items[0].get('id'),
			items[2].get('id'),
			items[1].get('id'),
		]);
	});

	it('can query array-based compound indexes by match and order', async () => {
		const storage = await createTestStorage();

		const items = await addTestingItems(storage);

		const query = storage.todos.findAll({
			index: {
				where: 'tagsSortedByDone',
				match: {
					tags: 'a',
				},
				order: 'asc',
			},
		});
		const results = await query.resolved;

		expect(results.map((i: any) => i.get('id'))).toEqual([
			items[0].get('id'),
			items[4].get('id'),
			items[1].get('id'),
			items[5].get('id'),
		]);
	});

	it('can limit query results of find all queries', async () => {
		const storage = await createTestStorage();

		const items = await addTestingItems(storage);

		const query = storage.todos.findAll({
			index: {
				where: 'categorySortedByDone',
				match: {
					category: 'general',
				},
				order: 'asc',
			},
			limit: 2,
		});
		const results = await query.resolved;

		expect(results.map((i: any) => i.get('id'))).toEqual([
			items[0].get('id'),
			items[2].get('id'),
		]);
	});

	it('can query starts-with on a string', async () => {
		const storage = createTestStorage();
		const items = await addTestingItems(storage);
		const query = storage.todos.findAll({
			index: {
				where: 'content',
				startsWith: 'item',
			},
		});

		const results = await query.resolved;

		expect(results.map((i: any) => i.get('id'))).toEqual([
			items[0].get('id'),
			items[1].get('id'),
			items[2].get('id'),
			items[4].get('id'),
		]);
	});

	it('can do a paginated query', async () => {
		const storage = await createTestStorage();

		const items = await addTestingItems(storage);

		const query = storage.todos.findPage({
			index: {
				where: 'categorySortedByDone',
				match: {
					category: 'general',
				},
				order: 'asc',
			},
			pageSize: 2,
			page: 0,
		});
		const results = await query.resolved;

		expect(results.map((i: any) => i.get('id'))).toEqual([
			items[0].get('id'),
			items[2].get('id'),
		]);
		expect(query.hasNextPage).toBe(true);

		await query.nextPage();

		expect(query.current.map((i: any) => i.get('id'))).toEqual([
			items[1].get('id'),
		]);
		expect(query.hasNextPage).toBe(false);
	});

	it('can do an infinite query', async () => {
		const storage = await createTestStorage();

		const items = await addTestingItems(storage);

		const query = storage.todos.findAllInfinite({
			index: {
				where: 'categorySortedByDone',
				match: {
					category: 'general',
				},
				order: 'asc',
			},
			pageSize: 2,
		});
		const results = await query.resolved;

		expect(results.map((i: any) => i.get('id'))).toEqual([
			items[0].get('id'),
			items[2].get('id'),
		]);
		expect(query.hasMore).toBe(true);

		await query.loadMore();

		expect(query.current.map((i: any) => i.get('id'))).toEqual([
			items[0].get('id'),
			items[2].get('id'),
			items[1].get('id'),
		]);
		expect(query.hasMore).toBe(false);
	});

	it('caches queries by user key and updates their filters', async () => {
		const storage = await createTestStorage();

		const items = await addTestingItems(storage);

		const firstQuery = storage.todos.findAll({
			key: 'customKey',
			index: {
				where: 'categorySortedByDone',
				match: {
					category: 'general',
				},
				order: 'asc',
			},
		});
		const firstResults = await firstQuery.resolved;
		expect(firstResults.map((i: any) => i.get('id'))).toEqual([
			items[0].get('id'),
			items[2].get('id'),
			items[1].get('id'),
		]);

		const secondQuery = storage.todos.findAll({
			key: 'customKey',
			index: {
				where: 'categorySortedByDone',
				match: {
					category: 'specific',
				},
				order: 'asc',
			},
		});

		// doesn't remove old results until ready
		expect(firstQuery.current.length).toBe(3);

		const secondResults = await secondQuery.resolved;
		expect(secondResults.map((i: any) => i.get('id'))).toEqual([
			items[4].get('id'),
			items[3].get('id'),
			items[5].get('id'),
		]);

		expect(firstQuery.current.map((i: any) => i.get('id'))).toEqual([
			items[4].get('id'),
			items[3].get('id'),
			items[5].get('id'),
		]);
	});

	it('disposes of unsubscribed queries after a period', async () => {
		const storage = await createTestStorage();
		const items = await addTestingItems(storage);

		vi.useFakeTimers();

		const query = storage.todos.findAll({
			index: {
				where: 'categorySortedByDone',
				match: {
					category: 'general',
				},
				order: 'asc',
			},
		});

		expect(storage.queries.activeKeys).toContain(query.key);

		// since the query is not subscribed, it should be disposed after a period (defaults 5s)
		vi.advanceTimersByTime(5001);

		expect(storage.queries.activeKeys).not.toContain(query.key);

		vi.useRealTimers();
	});

	it('keeps unsubscribed queries alive when told to', async () => {
		const storage = await createTestStorage();
		const items = await addTestingItems(storage);

		vi.useFakeTimers();

		const query = storage.todos.findAll({
			index: {
				where: 'categorySortedByDone',
				match: {
					category: 'general',
				},
				order: 'asc',
			},
		});

		expect(storage.queries.activeKeys).toContain(query.key);
		storage.queries.keepAlive(query.key);

		// since the query is not subscribed, it should be disposed after a period (defaults 5s)
		// overshoot that to be sure
		vi.advanceTimersByTime(10 * 1000);

		expect(storage.queries.activeKeys).toContain(query.key);

		// remove hold
		storage.queries.dropKeepAlive(query.key);

		// doesn't get disposed immediately
		expect(storage.queries.activeKeys).toContain(query.key);

		// should be disposed after the normal period
		vi.advanceTimersByTime(5001);

		expect(storage.queries.activeKeys).not.toContain(query.key);
	});
});

describe('query reactivity', () => {
	async function getQuery(storage: ClientWithCollections) {
		const item = await storage.todos.put({
			id: '1',
			content: 'item 1',
			done: false,
			tags: ['a'],
			category: 'general',
		});

		return storage.todos.get('1');
	}
	it('does not requery a get query when the item changes', async () => {
		const query = await getQuery(await createTestStorage());
		const item = await query.resolved;

		expect(item).toBeTruthy();
		assert(item);

		expect(item.get('content')).toBe('item 1');

		item.update({ content: 'updated' });

		expect(query.status).toBe('ready');
	});

	it('returns the initial result set after status changes to ready', async () => {
		const storage = await createTestStorage();
		await addTestingItems(storage);
		const query = storage.todos.findAll();
		expect(query.status).toBe('initial');
		const resolved = query.resolved;
		// accessing resolved begins initializing
		expect(query.status).toBe('initializing');
		await resolved;
		expect(query.status).toBe('ready');
		expect(query.current.length).toBe(6);
		// revalidating on change is tested elsewhere below.
	});

	it('updates a get query when the item is deleted', async () => {
		const client = await createTestStorage();
		const query = await getQuery(client);
		const item = await query.resolved;

		expect(item).toBeTruthy();
		assert(item);

		await client.todos.delete(item.get('id'));

		expect(query.current).toBe(null);
	});

	it('updates list queries when a document is added to the collection', async () => {
		const client = await createTestStorage({
			// log: console.log,
		});
		await addTestingItems(client);
		const queries = [
			client.todos.findAll(),
			client.todos.findAllInfinite({
				pageSize: 10,
			}),
			client.todos.findPage({
				pageSize: 2,
				page: 0,
			}),
		];

		await Promise.all(queries.map((q) => q.resolved));
		expect(queries[0].current.length).toBe(6);

		await client.todos.put({
			id: '7',
			content: 'item 7',
			done: false,
			tags: ['a'],
			category: 'general',
		});

		for (const query of queries) {
			expect(query.status).toBe('revalidating');
		}

		await Promise.all(queries.map((q) => q.resolved));
		expect(queries[0].current.length).toBe(7);
		expect(queries[1].current.length).toBe(7);
		expect(queries[2].current.length).toBe(2);
	});

	it('updates list queries when a document is removed from the collection', async () => {
		const client = await createTestStorage({
			// log: console.log,
		});
		await addTestingItems(client);
		const queries = [
			client.todos.findAll(),
			client.todos.findAllInfinite({
				pageSize: 10,
			}),
			client.todos.findPage({
				pageSize: 2,
				page: 2,
			}),
		];

		await Promise.all(queries.map((q) => q.resolved));
		expect(queries[0].current.length).toBe(6);

		await client.todos.delete('1');

		for (const query of queries) {
			expect(query.status).toBe('revalidating');
		}
		await Promise.all(queries.map((q) => q.resolved));
		expect(queries[0].current.length).toBe(5);
		expect(queries[1].current.length).toBe(5);
		expect(queries[2].current.length).toBe(1);
	});
});
