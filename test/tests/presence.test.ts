import { it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { waitForPeerCount, waitForPeerPresence } from '../lib/waits.js';

const { server, createTestClient } = createTestContext({
	library: 'presence-1',
});

it('updates presence of online clients', async () => {
	const clientA = await createTestClient({
		server,
		user: 'User A',
	});
	const clientB = await createTestClient({
		server,
		user: 'User B',
	});
	const clientC = await createTestClient({
		server,
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
