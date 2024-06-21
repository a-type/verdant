import { expect, it } from 'vitest';
import { startTestServer } from '../lib/testServer.js';
import { createTestClient } from '../lib/testClient.js';
import { waitForOnline, waitForQueryResult } from '../lib/waits.js';

it('migrates data from unified to sharded databases on launch', async () => {
	const unifiedServer = await startTestServer({
		disableSharding: true,
		disableRebasing: true,
		keepDb: true,
		// log: true,
	});

	// add some data to multiple libraries
	const libAClient = await createTestClient({
		library: 'sharding-a',
		user: 'A',
		server: unifiedServer,
	});
	libAClient.sync.start();
	await waitForOnline(libAClient);
	const libBClient = await createTestClient({
		library: 'sharding-b',
		user: 'B',
		server: unifiedServer,
	});
	libBClient.sync.start();
	await waitForOnline(libBClient);

	const a_apples = await libAClient.items.put({
		id: 'apples',
		content: 'Apples',
	});
	const b_bananas = await libBClient.items.put({
		id: 'bananas',
		content: 'Bananas',
	});

	a_apples.set('categoryId', 'foo');
	a_apples.set('purchased', true);
	a_apples.set('content', 'Granny Smith Apples');

	b_bananas.set('categoryId', 'bar');
	b_bananas.set('purchased', true);
	b_bananas.set('content', 'Cavendish Bananas');

	await libAClient.entities.flushAllBatches();
	await libBClient.entities.flushAllBatches();

	libAClient.sync.stop();
	libBClient.sync.stop();

	await unifiedServer.cleanup();

	const shardedServer = await startTestServer({
		disableSharding: false,
		disableRebasing: true,
		keepDb: true,
		// log: true,
		importShardsFrom: unifiedServer.databaseLocation,
	});

	expect(
		shardedServer.server.getLibraryInfo('sharding-a'),
	).toMatchInlineSnapshot(`Promise {}`);
	expect(
		shardedServer.server.getLibraryInfo('sharding-b'),
	).toMatchInlineSnapshot(`Promise {}`);

	const libAClient2 = await createTestClient({
		library: 'sharding-a',
		user: 'C',
		server: shardedServer,
	});
	libAClient2.sync.start();
	await waitForOnline(libAClient2);
	const libBClient2 = await createTestClient({
		library: 'sharding-b',
		user: 'D',
		server: shardedServer,
	});
	libBClient2.sync.start();
	await waitForOnline(libBClient2);

	const c_getApples = libAClient2.items.get('apples');
	await waitForQueryResult(c_getApples);
	expect(c_getApples.current?.getSnapshot()).toMatchInlineSnapshot(`
		{
		  "categoryId": "foo",
		  "comments": [],
		  "content": "Granny Smith Apples",
		  "id": "apples",
		  "image": null,
		  "purchased": true,
		  "tags": [],
		}
	`);

	const d_getBananas = libBClient2.items.get('bananas');
	await waitForQueryResult(d_getBananas);
	expect(d_getBananas.current?.getSnapshot()).toMatchInlineSnapshot(`
		{
		  "categoryId": "bar",
		  "comments": [],
		  "content": "Cavendish Bananas",
		  "id": "bananas",
		  "image": null,
		  "purchased": true,
		  "tags": [],
		}
	`);
});
