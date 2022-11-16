import { Client } from './client/index.js';
import { createTestClient } from './lib/testClient.js';
import { startTestServer } from './lib/testServer.js';
import { waitForPeerCount, waitForQueryResult } from './lib/waits.js';
import 'fake-indexeddb/auto';
import { WebSocket } from 'ws';

// @ts-ignore
global.WebSocket = WebSocket;

async function setup2PeerTest() {
	const server = await startTestServer();
	const cleanupClients: Client[] = [];

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
	cleanupClients.push(clientA, clientB);

	clientA.sync.start();
	clientB.sync.start();

	await waitForPeerCount(clientA, 1);
	console.info('🔺 --- Both clients online ---');

	const itemA = await clientA.items.create({
		id: 'a',
		content: '0',
	});

	const itemBQuery = clientB.items.get('a');
	await waitForQueryResult(itemBQuery);
	const itemB = await itemBQuery.resolved;

	return {
		clientA,
		clientB,
		itemA,
		itemB,
		cleanup: async () => {
			cleanupClients.forEach((c) => c.sync.stop());
			await server.cleanup();
		},
	};
}

async function do10kChangesToOneObject() {
	const { itemA, itemB, clientA, cleanup } = await setup2PeerTest();

	const changeWaitPromise = new Promise<void>((resolve) => {
		itemA.subscribe('change', () => {
			if (itemA.get('content') === '10000') {
				resolve();
			}
		});
	});

	let start = Date.now();

	for (let i = 0; i < 10001; i++) {
		itemB.set('content', `${i}`);
	}

	await changeWaitPromise;

	let end = Date.now();

	console.info(`✅ --- 10000 changes to one object in ${end - start}ms ---`);
	// best on my desktop so far is around 4s

	// now let's try rebasing
	start = Date.now();
	itemA.set('content', '0');

	await new Promise((resolve) => setTimeout(resolve, 1000));
	end = Date.now();
	const stats = await clientA.stats();
	console.info('Client storage stats', stats);
	if (stats.meta.operationsSize.count > 100) {
		console.error('🔺 Rebase was not performed!');
	}

	await cleanup();
}

async function do1kChangesToOneObjectUnbatched() {
	const { itemA, itemB, clientA, clientB, cleanup } = await setup2PeerTest();

	const changeWaitPromise = new Promise<void>((resolve) => {
		itemA.subscribe('change', () => {
			if (itemA.get('content') === '1000') {
				resolve();
			}
		});
	});

	let start = Date.now();

	for (let i = 0; i < 1001; i++) {
		itemB.set('content', `${i}`);
		clientB.entities.flushPatches();
	}

	await changeWaitPromise;

	let end = Date.now();

	console.info(
		`✅ --- 1000 UNBATCHED changes to one object in ${end - start}ms ---`,
	);
	// best on my desktop so far is around 13s

	await cleanup();
}

async function main() {
	await do10kChangesToOneObject();
	await do1kChangesToOneObjectUnbatched();

	process.exit(0);
}

main();
