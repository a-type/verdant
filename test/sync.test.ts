import { it, expect, beforeAll, afterAll, vitest } from 'vitest';
import { Client, Item, Query } from './client/index.js';
import { createTestContext } from './lib/createTestContext.js';
import {
	waitForCondition,
	waitForMockCall,
	waitForPeerCount,
	waitForQueryResult,
} from './lib/waits.js';

const context = createTestContext();

it('can sync multiple clients even if they go offline', async () => {
	const { server, createTestClient } = context;
	const clientA = await createTestClient({
		server,
		library: 'sync-1',
		user: 'User A',
		logId: 'A',
	});
	const clientB = await createTestClient({
		server,
		library: 'sync-1',
		user: 'User B',
		// logId: 'B',
	});
	const clientC = await createTestClient({
		server,
		library: 'sync-1',
		user: 'User C',
		// logId: 'C',
	});

	// seed data offline with A
	console.info('🔺 --- Client A offline seed ---');
	const a_produceCategory = await clientA.categories.put({
		name: 'Produce',
	});
	await clientA.items.put({
		categoryId: a_produceCategory.get('id'),
		content: 'Apples',
	});
	await clientA.items.put({
		categoryId: a_produceCategory.get('id'),
		content: 'Oranges',
	});
	const a_unknownItem = await clientA.items.put({
		content: 'Unknown',
	});
	// subscribe to make this a live item for later
	const a_unknownItemChanged = vitest.fn();
	a_unknownItem.subscribe('change', a_unknownItemChanged);

	await clientA.entities.flushPatches();

	// bring all clients online - but A must come up first to populate data.
	clientA.sync.start();
	await new Promise<void>((resolve) => {
		clientA.sync.subscribe('onlineChange', (isOnline) => {
			if (isOnline) resolve();
		});
	});

	clientB.sync.start();
	clientC.sync.start();

	console.info('🔺--- Going online ---');
	await waitForPeerCount(clientA, 2);
	console.info('🔺--- All clients online ---');

	// add some data to B
	const b_deliCategory = await clientB.categories.put({ name: 'Deli' });
	const b_steakItem = await clientB.items.put({
		categoryId: b_deliCategory.get('id'),
		content: 'Steak',
	});
	// subscribe to make this a live item for later
	const b_steakItemChanged = vitest.fn();
	b_steakItem.subscribe('change', b_steakItemChanged);

	async function expectCategoryToExist(
		client: Client,
		category: string,
		itemCount: number,
	) {
		const matchingCategoryQuery = client.categories.findOne({
			where: 'name',
			equals: category,
		});

		await waitForQueryResult(matchingCategoryQuery, (val) => {
			return !!val;
		});

		const matchingCategory = await matchingCategoryQuery.resolved;
		expect(matchingCategory).toBeTruthy();
		const matchingItemsQuery = client.items.findAll({
			where: 'categoryId',
			equals: matchingCategory!.get('id'),
		});
		await waitForQueryResult(
			matchingItemsQuery,
			(r) => r?.length === itemCount,
		);
		expect((await matchingItemsQuery.resolved).length).toBe(itemCount);
	}

	console.info('🔺--- Checking produce on B ---');
	await expectCategoryToExist(clientB, 'Produce', 2);
	console.info('🔺--- Checking produce on C ---');
	await expectCategoryToExist(clientC, 'Produce', 2);

	console.info('🔺--- Checking deli on A ---');
	await expectCategoryToExist(clientA, 'Deli', 1);
	console.info('🔺--- Checking deli on C ---');
	await expectCategoryToExist(clientC, 'Deli', 1);

	console.info('🔺--- Realtime sync actions ---');
	const c_steakItem = await clientC.items.get(b_steakItem.get('id')).resolved;
	expect(c_steakItem).toBeTruthy();
	c_steakItem.set('purchased', true);

	await waitForCondition(() => {
		return b_steakItem.get('purchased') === true;
	});
	expect(b_steakItem.get('purchased')).toBe(true);

	const b_unknownItem = await clientB.items.get(a_unknownItem.get('id'))
		.resolved;

	a_unknownItem.get('tags').add('tag1');
	a_unknownItem.get('tags').add('tag2');
	b_unknownItem.get('tags').add('tag3');
	b_unknownItem.get('tags').add('tag1');

	async function waitForTags(item: Item) {
		await waitForCondition(() => {
			return (
				item.get('tags').has('tag1') &&
				item.get('tags').has('tag2') &&
				item.get('tags').has('tag3')
			);
		});
		expect(item.get('tags').has('tag1')).toBe(true);
		expect(item.get('tags').has('tag2')).toBe(true);
		expect(item.get('tags').has('tag3')).toBe(true);
	}
	await waitForTags(a_unknownItem);
	await waitForTags(b_unknownItem);
	await waitForTags(await clientC.items.get(a_unknownItem.get('id')).resolved!);

	console.info('🔺--- Offline sync actions ---');
	// go offline on two clients and push different items to the comments
	// array. both items should end up synced.
	clientA.sync.stop();
	clientB.sync.stop();

	a_unknownItem.get('comments').push({
		authorId: 'User A',
		content: 'This is a comment from A',
	});
	b_unknownItem.get('comments').push({
		authorId: 'User B',
		content: 'This is a comment from B',
	});

	// simulate being online long enough to propagate batch operations
	await clientA.entities.flushPatches();
	await clientB.entities.flushPatches();

	console.info('🔺--- Going online again ---');
	clientA.sync.start();
	clientB.sync.start();

	async function expectCommentsToExist(
		client: Client,
		itemId: string,
		commentCount: number,
	) {
		const item = await client.items.get(itemId).resolved;
		expect(item.get('comments').length).toBe(commentCount);
	}

	await waitForQueryResult(
		clientA.items.get(a_unknownItem.get('id')),
		(item) => item?.get('comments').length === 2,
	);
	await expectCommentsToExist(clientA, a_unknownItem.get('id'), 2);
	await waitForQueryResult(
		clientB.items.get(a_unknownItem.get('id')),
		(item) => item?.get('comments').length === 2,
	);
	await expectCommentsToExist(clientB, a_unknownItem.get('id'), 2);
	await waitForQueryResult(
		clientC.items.get(a_unknownItem.get('id')),
		(item) => item?.get('comments').length === 2,
	);
	await expectCommentsToExist(clientC, a_unknownItem.get('id'), 2);
}, 30000);
