import { Client } from './client/index.js';
import { createTestClient } from './lib/testClient.js';
import { startTestServer } from './lib/testServer.js';
import { waitForPeerCount, waitForQueryResult } from './lib/waits.js';
import 'fake-indexeddb/auto';
import { WebSocket } from 'ws';

// @ts-ignore
global.WebSocket = WebSocket;

const do10kChangesToOneObject = async () => {
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

	const changeWaitPromise = new Promise<void>((resolve) => {
		itemA.subscribe('change', () => {
			if (itemA.get('content') === '10000') {
				resolve();
			}
		});
	});

	const start = Date.now();

	for (let i = 0; i < 10001; i++) {
		itemB.set('content', `${i}`);
	}

	await changeWaitPromise;

	const end = Date.now();

	console.info(`✅ --- 10000 changes to one object in ${end - start}ms ---`);
	// best on my desktop so far is around 13s

	cleanupClients.forEach((c) => c.sync.stop());
	await server.cleanup();
};

do10kChangesToOneObject().then(() => {
	process.exit(0);
});
