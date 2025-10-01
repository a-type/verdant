import { assert } from '@verdant-web/common';
import { expect, it, vitest } from 'vitest';
import { Client, Item } from '../client/index.js';
import { createTestContext } from '../lib/createTestContext.js';
import {
	waitForEntityCondition,
	waitForPeerCount,
	waitForQueryResult,
} from '../lib/waits.js';

const context = createTestContext({
	// testLog: true,
	// serverLog: true,
	library: 'sync',
});

it('can sync multiple clients even if they go offline', async () => {
	const { server, createTestClient, log } = context;
	const clientA = await createTestClient({
		server,
		user: 'User A',
		// logId: 'A',
	});
	const clientB = await createTestClient({
		server,
		user: 'User B',
		// logId: 'B',
	});
	const clientC = await createTestClient({
		server,
		user: 'User C',
		// logId: 'C',
	});

	// seed data offline with A
	log('🔺 --- Client A offline seed ---');
	const a_produceCategory = await clientA.categories.put({
		name: 'Produce',
		metadata: {
			color: 'green',
		},
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

	await clientA.entities.flushAllBatches();

	// bring all clients online - but A must come up first to populate data.
	clientA.sync.start();
	await new Promise<void>((resolve) => {
		clientA.sync.subscribe('onlineChange', (isOnline) => {
			if (isOnline) resolve();
		});
	});

	clientB.sync.start();
	clientC.sync.start();

	log('🔺--- Going online ---');
	await waitForPeerCount(clientA, 2);
	log('🔺--- All clients online ---');

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
			index: {
				where: 'name',
				equals: category,
			},
		});

		await waitForQueryResult(
			matchingCategoryQuery,
			(val) => {
				return !!val;
			},
			3000,
			`${client.namespace} category ${category}`,
		);

		const matchingCategory = await matchingCategoryQuery.resolved;
		expect(matchingCategory).toBeTruthy();
		const matchingItemsQuery = client.items.findAll({
			index: {
				where: 'categoryId',
				equals: matchingCategory!.get('id'),
			},
		});
		await waitForQueryResult(
			matchingItemsQuery,
			(r) => r?.length === itemCount,
		);
		expect((await matchingItemsQuery.resolved).length).toBe(itemCount);
	}

	log('🔺--- Checking produce on B ---');
	await expectCategoryToExist(clientB, 'Produce', 2);
	log('🔺--- Checking produce on C ---');
	await expectCategoryToExist(clientC, 'Produce', 2);

	log('🔺--- Checking deli on A ---');
	await expectCategoryToExist(clientA, 'Deli', 1);
	log('🔺--- Checking deli on C ---');
	await expectCategoryToExist(clientC, 'Deli', 1);

	log('🔺--- Realtime sync actions ---');
	const c_steakItem = await clientC.items.get(b_steakItem.get('id')).resolved;
	expect(c_steakItem).toBeTruthy();
	assert(c_steakItem);
	c_steakItem.set('purchased', true);

	await waitForEntityCondition(
		b_steakItem,
		(e) => {
			return e.get('purchased') === true;
		},
		10000,
		'steak item is purchased',
	);
	expect(b_steakItem.get('purchased')).toBe(true);

	const b_unknownItem = await clientB.items.get(a_unknownItem.get('id'))
		.resolved;
	expect(b_unknownItem).toBeTruthy();
	assert(b_unknownItem);

	a_unknownItem.get('tags').add('a');
	a_unknownItem.get('tags').add('b');
	b_unknownItem.get('tags').add('c');
	b_unknownItem.get('tags').add('a');

	// test deleting something attached to a document, then undoing that
	const b_produce = await clientB.categories.findOne({
		index: {
			where: 'name',
			equals: 'Produce',
		},
	}).resolved;
	assert(b_produce);
	await clientB
		.batch()
		.run(() => {
			b_produce.delete('metadata');
		})
		.commit();
	await waitForEntityCondition(
		a_produceCategory,
		(cat) => !cat.get('metadata'),
		10000,
		'category has no metadata',
	);
	clientB.undoHistory.undo();

	async function waitForTags(item: Item, debugName: string) {
		await waitForEntityCondition(
			item.get('tags'),
			(tags) => {
				return tags.has('a') && tags.has('b') && tags.has('c');
			},
			10000,
			debugName,
		);
		expect(item.get('tags').has('a')).toBe(true);
		expect(item.get('tags').has('b')).toBe(true);
		expect(item.get('tags').has('c')).toBe(true);
	}
	await waitForTags(a_unknownItem, 'a item has tags');
	await waitForTags(b_unknownItem, 'b item has tags');
	await waitForTags(
		(await clientC.items.get(a_unknownItem.get('id')).resolved)!,
		'c item has tags',
	);
	await waitForEntityCondition(
		a_produceCategory,
		(cat) => cat.get('metadata')?.get('color') === 'green',
	);

	log('🔺--- Offline sync actions ---');
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
	await clientA.entities.flushAllBatches();
	await clientB.entities.flushAllBatches();

	log('🔺--- Going online again ---');
	clientA.sync.start();
	clientB.sync.start();

	const a_unknownItemQ = clientA.items.get(a_unknownItem.get('id'));
	const b_unknownItemQ = clientB.items.get(a_unknownItem.get('id'));
	const c_unknownItemQ = clientC.items.get(a_unknownItem.get('id'));
	await waitForQueryResult(
		a_unknownItemQ,
		(item) => !!item,
		3000,
		'a unknown item',
	);
	log('🔺--- 1 ---');
	await waitForEntityCondition(
		a_unknownItemQ.current!,
		(item) => item?.get('comments').length === 2,
		3000,
		'a unknown item comment applied',
	);
	log('🔺--- 2 ---');
	await waitForQueryResult(
		b_unknownItemQ,
		(item) => !!item,
		3000,
		'b unknown item',
	);
	log('🔺--- 3 ---');
	await waitForEntityCondition(
		b_unknownItemQ.current!,
		(item) => item?.get('comments').length === 2,
	);
	log('🔺--- 4 ---');
	await waitForQueryResult(
		c_unknownItemQ,
		(item) => !!item,
		3000,
		'c unknown item',
	);
	log('🔺--- 5 ---');
	await waitForEntityCondition(
		c_unknownItemQ.current!,
		(item) => item?.get('comments').length === 2,
	);
}, 15000);
