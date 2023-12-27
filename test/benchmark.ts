import { Client, Query } from './client/index.js';
import { createTestClient } from './lib/testClient.js';
import { startTestServer } from './lib/testServer.js';
import 'fake-indexeddb/auto';
import { WebSocket } from 'ws';

function waitForPeerCount(client: Client, count: number, gte = false) {
	return new Promise<void>((resolve, reject) => {
		if (client.sync.presence.peerIds.length === count) {
			resolve();
			return;
		}
		const timeout = setTimeout(() => {
			reject(new Error('Timed out waiting for connections ' + count));
		}, 15000);
		const unsubscribe = client.sync.presence.subscribe(
			'peersChanged',
			(peers) => {
				if (
					client.sync.presence.peerIds.length === count ||
					(gte && client.sync.presence.peerIds.length >= count)
				) {
					unsubscribe();
					clearTimeout(timeout);
					resolve();
				}
			},
		);
	});
}

async function waitForQueryResult(
	query: Query<any>,
	predicate: (value: any) => boolean = (value) => {
		return !!value && (Array.isArray(value) ? value.length > 0 : true);
	},
	timeoutMs = 15000,
) {
	await new Promise<void>((resolve, reject) => {
		if (query.status !== 'initial' && predicate(query.current)) {
			resolve();
			return;
		}

		const timeout = setTimeout(() => {
			reject(new Error('Timed out waiting for query ' + query.key));
		}, timeoutMs);
		const unsubscribe = query.subscribe((result) => {
			if (predicate(query.current)) {
				unsubscribe();
				clearTimeout(timeout);
				resolve();
			}
		});
	});
}

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

	const itemA = await clientA.items.put({
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
		itemB?.set('content', `${i}`);
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
		itemB?.set('content', `${i}`);
		clientB.entities.flushAllBatches();
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
