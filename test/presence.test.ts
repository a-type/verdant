import { afterAll, beforeAll, it } from 'vitest';
import { createTestClient } from './lib/testClient.js';
import { startTestServer } from './lib/testServer.js';
import { waitForPeerCount, waitForPeerPresence } from './lib/waits.js';

let server: { port: number; cleanup: () => Promise<void> };
beforeAll(async () => {
	server = await startTestServer({ log: true });
});

afterAll(async () => {
	await server.cleanup();
}, 30 * 1000);

it('updates presence of online clients', async () => {
	const clientA = await createTestClient({
		server,
		library: 'presence-1',
		user: 'User A',
	});
	const clientB = await createTestClient({
		server,
		library: 'presence-1',
		user: 'User B',
	});
	const clientC = await createTestClient({
		server,
		library: 'presence-1',
		user: 'User C',
	});

	clientA.sync.start();
	clientB.sync.start();
	clientC.sync.start();

	await waitForPeerCount(clientA, 2, true);

	await clientA.sync.presence.update({ hello: 'world' });

	await waitForPeerPresence(
		clientB,
		'User A',
		(p) => p && p?.hello === 'world',
	);
	await waitForPeerPresence(
		clientC,
		'User A',
		(p) => p && p?.hello === 'world',
	);

	await clientB.sync.presence.update({ foo: 'bar' });

	await waitForPeerPresence(clientA, 'User B', (p) => p && p?.foo === 'bar');
	await waitForPeerPresence(clientC, 'User B', (p) => p && p?.foo === 'bar');
});
