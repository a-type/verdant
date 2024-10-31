import { afterAll, expect, it } from 'vitest';
import { startTestServer } from '../lib/testServer.js';
import { createTestClient } from '../lib/testClient.js';
import { waitForOnline, waitForQueryResult } from '../lib/waits.js';
import { rm } from 'fs/promises';

let unifiedServer: ReturnType<typeof startTestServer> extends Promise<infer T>
	? T
	: never;
let shardedServer: ReturnType<typeof startTestServer> extends Promise<infer T>
	? T
	: never;

afterAll(async () => {
	try {
		await unifiedServer.cleanup();
		await rm(unifiedServer.databaseLocation, { recursive: true });
	} catch (e) {
		console.error('Error cleaning up unified database:', e);
	}
	try {
		await shardedServer.cleanup();
		await rm(shardedServer.databaseLocation, { recursive: true });
	} catch (e) {
		console.error('Error cleaning up sharded databases:', e);
	}
}, 30 * 1000);

it('migrates data from unified to sharded databases on launch', async () => {
	unifiedServer = await startTestServer({
		disableSharding: true,
		disableRebasing: true,
		keepDb: true,
		log: true,
	});
	console.log('DB:', unifiedServer.databaseLocation);

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
	await libAClient.close();
	await libBClient.close();

	await unifiedServer.cleanup();

	shardedServer = await startTestServer({
		disableSharding: false,
		disableRebasing: true,
		keepDb: true,
		// log: true,
		importShardsFrom: unifiedServer.databaseLocation,
	});

	expect(await shardedServer.server.getLibraryInfo('sharding-a')).toEqual({
		baselinesCount: 0,
		globalAck: expect.any(String),
		id: 'sharding-a',
		latestServerOrder: 6,
		operationsCount: 6,
		replicas: [
			{
				ackedLogicalTime: expect.any(String),
				ackedServerOrder: 0,
				id: expect.any(String),
				profile: {
					id: 'A',
				},
				truant: false,
				type: 0,
			},
		],
	});
	expect(await shardedServer.server.getLibraryInfo('sharding-b')).toEqual({
		baselinesCount: 0,
		globalAck: expect.any(String),
		id: 'sharding-b',
		latestServerOrder: 6,
		operationsCount: 6,
		replicas: [
			{
				ackedLogicalTime: expect.any(String),
				ackedServerOrder: 0,
				id: expect.any(String),
				profile: {
					id: 'B',
				},
				truant: false,
				type: 0,
			},
		],
	});

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
