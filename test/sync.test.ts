import { it, expect, beforeAll, afterAll, vitest } from 'vitest';
import { Client, Query } from './client/index.js';
import { createTestClient } from './lib/testClient.js';
import { startTestServer } from './lib/testServer.js';
import {
	waitForCondition,
	waitForMockCall,
	waitForPeerCount,
	waitForQueryResult,
} from './lib/waits.js';

const cleanupClients: Client[] = [];

let server: { port: number; cleanup: () => Promise<void> };
beforeAll(async () => {
	server = await startTestServer();
});

afterAll(async () => {
	cleanupClients.forEach((c) => c.sync.stop());
	await server.cleanup();
}, 30 * 1000);

it('can sync multiple clients even if they go offline', async () => {
	const clientA = await createTestClient({
		server,
		library: 'sync-1',
		user: 'User A',
	});
	const clientB = await createTestClient({
		server,
		library: 'sync-1',
		user: 'User B',
	});
	const clientC = await createTestClient({
		server,
		library: 'sync-1',
		user: 'User C',
	});
	cleanupClients.push(clientA, clientB, clientC);

	// seed data offline with A
	console.info('🔺 --- Client A offline seed ---');
	const a_produceCategory = await clientA.categories.create({
		name: 'Produce',
	});
	await clientA.items.create({
		categoryId: a_produceCategory.get('id'),
		content: 'Apples',
	});
	await clientA.items.create({
		categoryId: a_produceCategory.get('id'),
		content: 'Oranges',
	});
	const a_unknownItem = await clientA.items.create({
		content: 'Unknown',
	});
	// subscribe to make this a live item for later
	const a_unknownItemChanged = vitest.fn();
	a_unknownItem.subscribe('change', a_unknownItemChanged);

	// seed data offline with B, too
	console.info('🔺--- Client B offline seed ---');
	const b_deliCategory = await clientB.categories.create({ name: 'Deli' });
	const b_steakItem = await clientB.items.create({
		categoryId: b_deliCategory.get('id'),
		content: 'Steak',
	});
	// subscribe to make this a live item for later
	const b_steakItemChanged = vitest.fn();
	b_steakItem.subscribe('change', b_steakItemChanged);

	// bring all clients online
	clientA.sync.start();
	clientB.sync.start();
	clientC.sync.start();

	console.info('🔺--- Going online ---');
	await waitForPeerCount(clientA, 2);
	console.info('🔺--- All clients online ---');

	async function expectCategoryToExist(
		client: Client,
		category: string,
		itemCount: number,
	) {
		const matchingCategoryQuery = client.categories.findOne({
			where: 'name',
			equals: category,
		});

		await waitForQueryResult(matchingCategoryQuery);

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

	console.info('🔺--- Offline sync actions ---');
	// go offline on two clients and push different items to the comments
	// array. both items should end up synced.
	clientA.sync.stop();
	clientB.sync.stop();

	a_unknownItem.get('comments').push({
		authorId: 'User A',
		content: 'This is a comment from A',
	});
	const b_unknownItem = await clientB.items.get(a_unknownItem.get('id'))
		.resolved;
	b_unknownItem.get('comments').push({
		authorId: 'User B',
		content: 'This is a comment from B',
	});

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
});
