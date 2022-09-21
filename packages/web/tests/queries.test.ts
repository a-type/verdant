import { describe, it, expect } from 'vitest';
import { StorageCollection } from '../src/StorageCollection.js';
import { createTestStorage, todoCollection } from './fixtures/testStorage.js';

describe('storage queries', () => {
	async function addTestingItems(
		todos: StorageCollection<typeof todoCollection>,
	) {
		let items = new Array<any>();

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
			items.push(await todos.create(item));
		}
		return items;
	}

	it('can query simple compound indexes by match and order', async () => {
		const storage = await createTestStorage();
		const todos = storage.get('todo');

		const items = await addTestingItems(todos);

		const query = todos.getAll({
			where: 'categorySortedByDone',
			match: {
				category: 'general',
			},
			order: 'asc',
		});
		const results = await query.resolved;

		expect(results.map((i) => i.id)).toEqual([
			items[0].id,
			items[2].id,
			items[1].id,
		]);
	});

	it('can query array-based compound indexes by match and order', async () => {
		const storage = await createTestStorage();
		const todos = storage.get('todo');

		const items = await addTestingItems(todos);

		console.log(await todos.__unsafe__test_api__.getAllRaw());

		const query = todos.getAll({
			where: 'tagsSortedByDone',
			match: {
				tags: 'a',
			},
			order: 'asc',
		});
		const results = await query.resolved;

		expect(results.map((i) => i.id)).toEqual([
			items[0].id,
			items[4].id,
			items[1].id,
			items[5].id,
		]);
	});
});
