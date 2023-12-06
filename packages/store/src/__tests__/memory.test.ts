import { beforeAll, describe, expect, it } from 'vitest';
import { createTestStorage } from './fixtures/testStorage.js';
import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';
import { ClientWithCollections, Entity } from '../index.js';
import { createOid } from '@verdant-web/common';
import * as utils from 'util';

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

let gc: any;
setFlagsFromString('--expose_gc');
gc = runInNewContext('gc');
describe('memory management', () => {
	it('allows for garbage collection of entities', async () => {
		const storage = await createTestStorage({
			weakRefs: true,
		});

		const items = await addTestingItems(storage);

		// in an independent scope, retrieve all items
		{
			const query = storage.todos.findAll();
			const results = await query.resolved;
			expect(results.length).toBe(6);
		}

		// in main scope, let's reference one item
		const item1 = await storage.todos.get('1').resolved;

		// in two parallel scopes, let's retrieve all items. in one we will
		// make changes, in the other we will check for changes
		async function modifyScope() {
			const query = storage.todos.findAll();
			const results = await query.resolved;
			expect(results.length).toBe(6);
			results.forEach((item) => {
				item.get('tags').push('d');
			});
		}
		async function checkScope() {
			const query = storage.todos.findAll();
			const results = await query.resolved;
			expect(results.length).toBe(6);
			await Promise.all(
				results.map((item) => {
					return new Promise<void>((resolve) => {
						item.subscribe('changeDeep', () => {
							expect(item.get('tags').includes('d')).toBe(true);
							resolve();
						});
					});
				}),
			);
		}
		await Promise.all([modifyScope(), checkScope()]);

		// now let's garbage collect all items
		gc();
		console.log('Manual gc', process.memoryUsage());

		// let's make sure we can still access the one item we have a reference to
		expect(item1.get('content')).toBe('item 1');

		// the others should be removed from the cache
		['2', '3', '4', '5', '6'].forEach((id) => {
			expect(storage.entities.getCached(createOid('todos', id))).toBe(null);
		});
	});
});
