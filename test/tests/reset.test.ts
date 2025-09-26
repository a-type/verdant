import { createMigration } from '@verdant-web/common';
import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import {
	waitForCondition,
	waitForOnline,
	waitForPeerCount,
	waitForQueryResult,
	waitForSync,
} from '../lib/waits.js';
import migrations from '../migrations/index.js';
import schema from '../schema.js';

async function connectAndSeedData({
	log,
	createTestClient,
}: ReturnType<typeof createTestContext>) {
	const clientA = await createTestClient({
		user: 'User A',
		// logId: 'A',
	});
	const clientB = await createTestClient({
		user: 'User B',
		// logId: 'B',
	});

	// seed data into library
	await clientA.sync.start();
	await waitForSync(clientA);

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

	await clientB.sync.start();
	await waitForPeerCount(clientA, 1, true);

	await waitForQueryResult(clientB.items.get(a_apples.get('id')));
	await waitForQueryResult(clientB.items.get(a_oranges.get('id')));
	await waitForQueryResult(clientB.items.get(a_unknownItem.get('id')));
	await waitForQueryResult(clientB.categories.get(a_produceCategory.get('id')));

	log('Seeded data into library');
	return {
		clientA,
		clientB,
		a_produceCategory,
		a_unknownItem,
	};
}

async function connectNewReplicaAndCheckIntegrity(
	ctx: ReturnType<typeof createTestContext>,
	{ a_unknownItem, a_produceCategory }: any,
) {
	ctx.log('Connecting new replica to test integrity');
	const clientC = await ctx.createTestClient({
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
	const ctx = createTestContext({
		library: 'reset-1',
	});
	const { clientA, clientB, a_unknownItem, a_produceCategory } =
		await connectAndSeedData(ctx);

	clientA.sync.stop();
	clientB.sync.stop();

	// reset server
	await ctx.server.evict('reset-1');

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

	await clientA.sync.start();
	await waitForSync(clientA);
	ctx.log('Client A online');
	// client A should now "win" and re-initialize server data

	await waitForQueryResult(clientA.items.get(a_unknownItem.get('id')));
	await waitForQueryResult(
		clientA.items.get(a_banana.get('id')),
		undefined,
		1500,
		'A confirms banana',
	);
	// A should not have pear
	expect(await clientA.items.get(pearId).resolved).toBe(null);

	await clientB.sync.start();
	ctx.log('Waiting for client B to re-initialize');
	await waitForSync(clientB);

	await waitForQueryResult(clientB.items.get(a_unknownItem.get('id')));
	await waitForQueryResult(
		clientB.items.get(a_banana.get('id')),
		undefined,
		1500,
		'B receives banana',
	);
	const b_pearQuery = clientB.items.get(pearId);
	await waitForQueryResult(b_pearQuery, (val) => {
		return !val;
	});
	expect(b_pearQuery.current).toBe(null);

	const clientC = await connectNewReplicaAndCheckIntegrity(ctx, {
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
	const ctx = createTestContext({
		library,
	});
	const { clientA, clientB, a_unknownItem, a_produceCategory } =
		await connectAndSeedData(ctx);

	await ctx.server.evict(library);
	await waitForOnline(clientA, false);
	await waitForOnline(clientA, true);

	await waitForOnline(clientA);
	await waitForOnline(clientB);

	await waitForQueryResult(clientA.items.get(a_unknownItem.get('id')));
	await waitForQueryResult(clientA.categories.get(a_produceCategory.get('id')));
	await waitForQueryResult(clientB.items.get(a_unknownItem.get('id')));
	await waitForQueryResult(clientB.categories.get(a_produceCategory.get('id')));

	const clientC = await connectNewReplicaAndCheckIntegrity(ctx, {
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
	const ctx = createTestContext({
		library,
	});
	const { clientA, clientB, a_unknownItem, a_produceCategory } =
		await connectAndSeedData(ctx);

	clientA.sync.stop();
	clientB.sync.stop();

	await ctx.server.evict(library);

	clientA.sync.setMode('pull');
	clientA.sync.start();
	await waitForOnline(clientA);

	const clientC = await connectNewReplicaAndCheckIntegrity(ctx, {
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

it('can re-initialize a replica from data from an old schema', async () => {
	const library = 'reset-4';
	const ctx = createTestContext({
		library,
	});
	const clientA = await ctx.createTestClient({
		user: 'User A',
		// logId: 'A',
	});

	clientA.sync.start();

	await waitForSync(clientA);

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

	await clientA.close();

	// make a new version without categories. we'll also alter items
	// to prove the migration was run.
	const { categories, items, ...collections } = schema.collections;
	const newSchema = {
		...schema,
		collections: {
			...collections,
			items: {
				...items,
				fields: {
					...items.fields,
					newField: {
						type: 'string' as const,
						default: 'new field',
					},
				},
			},
		},
		version: schema.version + 1,
	};
	const newMigrations = [...migrations, createMigration(schema, newSchema)];

	const clientB = await ctx.createTestClient({
		user: 'User B',
		schema: newSchema,
		oldSchemas: [schema, newSchema],
		migrations: newMigrations,
		// logId: 'B',
	});

	clientB.sync.start();
	await waitForSync(clientB);

	const b_applesQuery = clientB.items.get(a_apples.get('id'));
	await waitForQueryResult(b_applesQuery);

	// the new schema will not necessarily be applied immediately.
	// I think it's possible for the item query to resolve mid-migration.
	await waitForCondition(() => {
		try {
			// newField isn't part of the client typings
			b_applesQuery.current?.get('newField');
			return true;
		} catch {
			return false;
		}
	});
	const b_apples = b_applesQuery.current! as any;
	expect(b_apples.get('newField')).toBe('new field');
});
