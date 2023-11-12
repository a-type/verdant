import { ReplicaType } from '@verdant-web/server';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { Client, ClientDescriptor } from './client/index.js';
import { createTestClient } from './lib/testClient.js';
import { startTestServer } from './lib/testServer.js';
import {
	waitForBaselineCount,
	waitForEverythingToRebase,
	waitForPeerCount,
	waitForQueryResult,
} from './lib/waits.js';
import migrations from './migrations/index.js';

const cleanupClients: Client[] = [];

let server: { port: number; cleanup: () => Promise<void> };
beforeAll(async () => {
	server = await startTestServer();
});

afterAll(async () => {
	cleanupClients.forEach((c) => c.sync.stop());
	await server.cleanup();
}, 30 * 1000);

it('an offline client rebases everything', async () => {
	const indexedDb = new IDBFactory();
	const desc = new ClientDescriptor({
		migrations,
		namespace: 'offline_rebase',
		indexedDb,
		// log: (...args: any[]) => console.log('[offline_rebase]', ...args),
	});
	const client = await desc.open();

	const produce = await client.categories.put({
		name: 'Produce',
	});
	const apples = await client.items.put({
		content: 'Apples',
		categoryId: produce.get('id'),
	});
	apples.get('comments').push({
		content: 'Yum',
		authorId: 'Anon',
	});
	apples.set('purchased', true);
	const oranges = await client.items.put({
		content: 'Oranges',
		categoryId: produce.get('id'),
	});
	oranges.get('tags').push('orange');
	oranges.get('comments').push({
		content: 'Do not eat the peel',
		authorId: 'Anon',
	});
	oranges.get('comments').delete(0);
	oranges.set('purchased', true);
	oranges.set('purchased', false);

	// now we wait for everything to settle.
	await waitForEverythingToRebase(client);
	expect((await client.stats()).meta.operationsSize.count).toBe(0);
});

it('passive clients do not interfere with rebasing when offline', async () => {
	const clientA = await createTestClient({
		server,
		library: 'rebase-passive-1',
		user: 'User A',
		// logId: 'A',
	});
	const clientB = await createTestClient({
		server,
		library: 'rebase-passive-1',
		user: 'User B',
		// logId: 'B',
	});
	const clientC = await createTestClient({
		server,
		library: 'rebase-passive-1',
		user: 'User C',
		type: ReplicaType.PassiveRealtime,
		// logId: 'C',
	});

	clientA.sync.start();
	clientB.sync.start();
	clientC.sync.start();

	await waitForPeerCount(clientA, 2);

	clientA.categories.put({
		name: 'Produce',
	});
	clientA.items.put({
		content: 'Apples',
	});
	clientC.items.put({
		content: 'Oranges',
	});

	console.info('🔺 --- Waiting for all realtime changes to rebase ---');
	await waitForBaselineCount(clientA, 4);
	await waitForBaselineCount(clientB, 4);
	await waitForBaselineCount(clientC, 4);

	console.info('🔺 --- Disconnecting passive replica ---');
	clientC.sync.stop();

	const oranges = await clientA.items.put({
		content: 'Oranges',
	});
	oranges.set('purchased', true);
	await clientB.items.put({
		content: 'Bananas',
	});

	console.info('🔺 --- Waiting for all new changes to rebase ---');
	await waitForBaselineCount(clientA, 10);
	await waitForBaselineCount(clientB, 10);

	// actual numbers here aren't the most important, just that the baselines are
	// created even though client C is offline.

	expect(
		(await clientA.stats()).meta.baselinesSize.count,
	).toBeGreaterThanOrEqual(10);
	expect(
		(await clientB.stats()).meta.baselinesSize.count,
	).toBeGreaterThanOrEqual(10);

	// can client C come back online and sync up to the latest state?
	console.info('🔺 --- Reconnecting passive replica ---');
	clientC.sync.start();
	await waitForQueryResult(clientC.items.get(oranges.get('id')));
	expect(
		(await clientC.items.get(oranges.get('id')).resolved)!.get('purchased'),
	).toBe(true);
});
