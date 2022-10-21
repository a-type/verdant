import { describe, it, expect } from 'vitest';
import { createTestStorage } from './fixtures/testStorage.js';
import type { Storage } from '../index.js';

describe('storage queries', () => {
	async function addTestingItems(storage: Storage<any>) {
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
				content: 'item 4',
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
				content: 'item 6',
				done: true,
				tags: ['a'],
				category: 'specific',
			},
		]) {
			items.push(await storage.create('todo', item));
		}
		return items;
	}

	it('can query simple compound indexes by match and order', async () => {
		const storage = await createTestStorage();

		const items = await addTestingItems(storage);

		const query = storage.queryMaker.findAll('todo', {
			where: 'categorySortedByDone',
			match: {
				category: 'general',
			},
			order: 'asc',
		});
		const results = await query.resolved;

		expect(results.map((i) => i.get('id'))).toEqual([
			items[0].get('id'),
			items[2].get('id'),
			items[1].get('id'),
		]);
	});

	it('can query array-based compound indexes by match and order', async () => {
		const storage = await createTestStorage();

		const items = await addTestingItems(storage);

		const query = storage.queryMaker.findAll('todo', {
			where: 'tagsSortedByDone',
			match: {
				tags: 'a',
			},
			order: 'asc',
		});
		const results = await query.resolved;

		expect(results.map((i) => i.get('id'))).toEqual([
			items[0].get('id'),
			items[4].get('id'),
			items[1].get('id'),
			items[5].get('id'),
		]);
	});
});
