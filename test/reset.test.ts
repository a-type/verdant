import { afterAll, beforeAll, expect, it } from 'vitest';
import { createTestClient } from './lib/testClient.js';
import { startTestServer } from './lib/testServer.js';
import {
	waitForOnline,
	waitForPeerCount,
	waitForQueryResult,
} from './lib/waits.js';
import { log } from './lib/log.js';
import { createTestContext } from './lib/createTestContext.js';

const ctx = createTestContext({
	testLog: true,
});

async function connectAndSeedData(library = 'reset-1') {
	const clientA = await ctx.createTestClient({
		library,
		user: 'User A',
	});
	const clientB = await ctx.createTestClient({
		library,
		user: 'User B',
		logId: 'B',
	});

	// seed data into library
	clientA.sync.start();
	clientB.sync.start();

	await waitForPeerCount(clientA, 1, true);

	const a_produceCategory = await clientA.categories.put({
		name: 'Produce',
		id: 'produce',
	});
	const a_apples = await clientA.items.put({
		categoryId: a_produceCategory.get('id'),
		content: 'Apples',
		id: 'apples',
	});
	const a_oranges = await clientA.items.put({
		categoryId: a_produceCategory.get('id'),
		content: 'Oranges',
		id: 'oranges',
	});
	const a_unknownItem = await clientA.items.put({
		content: 'Unknown',
		id: 'unknown',
	});

	await waitForQueryResult(clientB.items.get(a_apples.get('id')));
	await waitForQueryResult(clientB.items.get(a_oranges.get('id')));
	await waitForQueryResult(clientB.items.get(a_unknownItem.get('id')));
	await waitForQueryResult(clientB.categories.get(a_produceCategory.get('id')));

	ctx.log('Seeded data into library');
	return {
		clientA,
		clientB,
		a_produceCategory,
		a_unknownItem,
	};
}

async function connectNewReplicaAndCheckIntegrity(
	library = 'reset-1',
	{ a_unknownItem, a_produceCategory }: any,
) {
	log('Connecting new replica to test integrity');
	const clientC = await ctx.createTestClient({
		library,
		user: 'User C',
		// logId: 'C',
	});
	clientC.sync.start();

	await waitForQueryResult(clientC.items.get(a_unknownItem.get('id')));
	await waitForQueryResult(clientC.categories.get(a_produceCategory.get('id')));
	await waitForQueryResult(clientC.items.findAll());
	return clientC;
}

function filterOutIds(snapshot: any) {
	const { id, categoryId, ...rest } = snapshot;
	return rest;
}

function compareSortContent(a: any, b: any) {
	return a.content.localeCompare(b.content);
}

it('can re-initialize from replica after resetting server-side while replicas are offline', async () => {
	const { clientA, clientB, a_unknownItem, a_produceCategory } =
		await connectAndSeedData();

	clientA.sync.stop();
	clientB.sync.stop();

	// reset server
	ctx.server.server.evictLibrary('reset-1');

	// add more data offline with A and B
	const a_banana = await clientA.items.put({
		id: 'banana',
		categoryId: a_produceCategory.get('id'),
		content: 'Bananas',
	});

	const b_pear = await clientB.items.put({
		id: 'pear',
		categoryId: a_produceCategory.get('id'),
		content: 'Pears',
	});
	const pearId = b_pear.get('id');

	clientA.sync.start();
	await waitForOnline(clientA);
	ctx.log('Client A online');
	// client A should now "win" and re-initialize server data

	await waitForQueryResult(clientA.items.get(a_unknownItem.get('id')));
	await waitForQueryResult(clientA.items.get(a_banana.get('id')));

	clientB.sync.start();
	ctx.log('Waiting for client B to re-initialize');

	await waitForQueryResult(clientB.items.get(a_unknownItem.get('id')));
	await waitForQueryResult(
		clientB.items.get(a_banana.get('id')),
		(val) => {
			return !!val;
		},
		1000,
	);
	const b_pearQuery = clientB.items.get(pearId);
	await waitForQueryResult(b_pearQuery, (val) => {
		return !val;
	});
	expect(b_pearQuery.current).toBe(null);

	const clientC = await connectNewReplicaAndCheckIntegrity('reset-1', {
		a_unknownItem,
		a_produceCategory,
	});
	expect(
		(await clientC.items.findAll().resolved)
			.map((i) => filterOutIds(i.getSnapshot()))
			.sort(compareSortContent),
	).toMatchInlineSnapshot(`
		[
		  {
		    "comments": [],
		    "content": "Apples",
		    "image": null,
		    "purchased": false,
		    "tags": [],
		  },
		  {
		    "comments": [],
		    "content": "Bananas",
		    "image": null,
		    "purchased": false,
		    "tags": [],
		  },
		  {
		    "comments": [],
		    "content": "Oranges",
		    "image": null,
		    "purchased": false,
		    "tags": [],
		  },
		  {
		    "comments": [],
		    "content": "Unknown",
		    "image": null,
		    "purchased": false,
		    "tags": [],
		  },
		]
	`);
});

it('can re-initialize in realtime when replicas are still connected', async () => {
	const library = 'reset-2';
	const { clientA, clientB, a_unknownItem, a_produceCategory } =
		await connectAndSeedData(library);

	ctx.server.server.evictLibrary(library);
	await waitForOnline(clientA, false);
	await waitForOnline(clientA, true);

	await waitForOnline(clientA);
	await waitForOnline(clientB);

	await waitForQueryResult(clientA.items.get(a_unknownItem.get('id')));
	await waitForQueryResult(clientA.categories.get(a_produceCategory.get('id')));
	await waitForQueryResult(clientB.items.get(a_unknownItem.get('id')));
	await waitForQueryResult(clientB.categories.get(a_produceCategory.get('id')));

	const clientC = await connectNewReplicaAndCheckIntegrity(library, {
		a_unknownItem,
		a_produceCategory,
	});
	expect(
		(await clientC.items.findAll().resolved)
			.map((i) => filterOutIds(i.getSnapshot()))
			.sort(compareSortContent),
	).toMatchInlineSnapshot(`
		[
		  {
		    "comments": [],
		    "content": "Apples",
		    "image": null,
		    "purchased": false,
		    "tags": [],
		  },
		  {
		    "comments": [],
		    "content": "Oranges",
		    "image": null,
		    "purchased": false,
		    "tags": [],
		  },
		  {
		    "comments": [],
		    "content": "Unknown",
		    "image": null,
		    "purchased": false,
		    "tags": [],
		  },
		]
	`);
});

it('resets from replica over http sync', async () => {
	const library = 'reset-3';
	const { clientA, clientB, a_unknownItem, a_produceCategory } =
		await connectAndSeedData(library);

	clientA.sync.stop();
	clientB.sync.stop();

	ctx.server.server.evictLibrary(library);

	clientA.sync.setMode('pull');
	clientA.sync.start();
	await waitForOnline(clientA);

	const clientC = await connectNewReplicaAndCheckIntegrity(library, {
		a_unknownItem,
		a_produceCategory,
	});
	expect(
		(await clientC.items.findAll().resolved)
			.map((i) => filterOutIds(i.getSnapshot()))
			.sort(compareSortContent),
	).toMatchInlineSnapshot(`
		[
		  {
		    "comments": [],
		    "content": "Apples",
		    "image": null,
		    "purchased": false,
		    "tags": [],
		  },
		  {
		    "comments": [],
		    "content": "Oranges",
		    "image": null,
		    "purchased": false,
		    "tags": [],
		  },
		  {
		    "comments": [],
		    "content": "Unknown",
		    "image": null,
		    "purchased": false,
		    "tags": [],
		  },
		]
	`);
});
