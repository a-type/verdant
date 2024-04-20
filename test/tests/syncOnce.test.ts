import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { waitForQueryResult, waitForTime } from '../lib/waits.js';

const context = createTestContext({
	// testLog: true,
});

it('can use syncOnce to manually sync an offline client', async () => {
	const { server, createTestClient, log } = context;

	const onlineClient = await createTestClient({
		server,
		library: 'syncOnce-1',
		user: 'A',
	});
	const offlineClient = await createTestClient({
		server,
		library: 'syncOnce-1',
		user: 'B',
		logId: 'offline',
	});

	onlineClient.sync.start();

	onlineClient.items.put({
		id: '1',
		content: 'Item 1',
	});
	onlineClient.items.put({
		id: '2',
		content: 'Item 2',
	});
	onlineClient.categories.put({
		id: '1',
		name: 'Category 1',
	});

	await onlineClient.entities.flushAllBatches();

	// TODO: is there a better way to ensure the online
	// changes reached the server?
	await waitForTime(500);

	log('Ready to test syncOnce');

	// since this only awaits the network portion,
	// not storage/processing, we still have to wait
	// for queries to populate results below
	await offlineClient.sync.syncOnce();

	const itemsQuery = offlineClient.items.findAll();
	const categoriesQuery = offlineClient.categories.findAll();

	await waitForQueryResult(itemsQuery);
	await waitForQueryResult(categoriesQuery);

	expect(itemsQuery.current.map((i) => i.getSnapshot())).toMatchInlineSnapshot(
		`
		[
		  {
		    "categoryId": null,
		    "comments": [],
		    "content": "Item 1",
		    "id": "1",
		    "image": null,
		    "purchased": false,
		    "tags": [],
		  },
		  {
		    "categoryId": null,
		    "comments": [],
		    "content": "Item 2",
		    "id": "2",
		    "image": null,
		    "purchased": false,
		    "tags": [],
		  },
		]
	`,
	);
	expect(categoriesQuery.current.map((c) => c.getSnapshot()))
		.toMatchInlineSnapshot(`
		[
		  {
		    "id": "1",
		    "metadata": null,
		    "name": "Category 1",
		  },
		]
	`);
});
