import { it, expect, beforeAll, afterAll, vitest } from 'vitest';
import { Client } from './client/index.js';
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

it(
	'can undo a push of an object even if another push has happened since',
	async () => {
		const clientA = await createTestClient({
			server,
			library: 'sync-1',
			user: 'User A',
			logId: 'A',
		});
		const clientB = await createTestClient({
			server,
			library: 'sync-1',
			user: 'User B',
			logId: 'B',
		});
		const clientC = await createTestClient({
			server,
			library: 'sync-1',
			user: 'User C',
			// logId: 'C',
		});
		cleanupClients.push(clientA, clientB, clientC);

		clientA.sync.start();
		clientB.sync.start();

		const a_itemA = await clientA.items.create({
			comments: [],
			content: 'Item A',
		});
		a_itemA.get('id');

		await waitForPeerCount(clientA, 1, true);
		console.log('🔺 --- Online ---');

		await waitForQueryResult(clientB.items.get(a_itemA.get('id')));
		const b_itemA = await clientB.items.get(a_itemA.get('id')).resolved;

		clientA.sync.stop();
		clientB.sync.stop();

		await waitForCondition(() => !clientA.sync.isConnected);
		await waitForCondition(() => !clientB.sync.isConnected);

		console.log('🔺 --- Offline ---');

		console.log('🔺 --- Client B push ---');
		b_itemA.get('comments').push({
			authorId: 'user-b',
			content: 'Goodbye world',
		});
		// advanced behavior - manually flushing patch queue so these are
		// committed offline
		clientB.entities.flushPatches();
		await new Promise((resolve) => setTimeout(resolve, 100));
		console.log('🔺 --- Client A push ---');
		a_itemA.get('comments').push({
			authorId: 'user-a',
			content: 'Hello world',
		});
		// advanced behavior - manually flushing patch queue so these are
		// committed offline
		clientA.entities.flushPatches();

		clientA.sync.start();
		clientB.sync.start();

		await waitForPeerCount(clientA, 1, true);
		console.log('🔺 --- Online again ---');

		await waitForCondition(() => {
			return a_itemA.get('comments').length === 2;
		});
		expect(a_itemA.get('comments').length).toBe(2);
		expect(a_itemA.get('comments').get(0).get('content')).toBe('Goodbye world');
		expect(a_itemA.get('comments').get(1).get('content')).toBe('Hello world');

		console.log('🔺 --- Client A undo ---');
		clientA.undoHistory.undo();

		await waitForCondition(() => {
			return a_itemA.get('comments').length === 1;
		});

		expect(a_itemA.get('comments').length).toBe(1);
		expect(a_itemA.get('comments').get(0).get('content')).toBe('Goodbye world');
	},
	20 * 1000,
);
