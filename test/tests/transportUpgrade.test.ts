import { expect, it } from 'vitest';
import { Client } from '../client/index.js';
import { createTestContext } from '../lib/createTestContext.js';
import {
	waitForCondition,
	waitForQueryResult,
	waitForSync,
} from '../lib/waits.js';

// separate libraries so presence from one scenario can't leak into the other
const differentUsersContext = createTestContext({
	library: 'transport-upgrade-different',
});
const sameUserContext = createTestContext({
	library: 'transport-upgrade-same',
});

function describeSync(client: Client) {
	return `mode=${client.sync.mode} connected=${client.sync.isConnected} peers=${client.sync.presence.peerIds.length} selfReplicas=${client.sync.presence.selfReplicaIds.size}`;
}

async function startSequentiallyAndExpectUpgrade(
	context: ReturnType<typeof createTestContext>,
	userA: string,
	userB: string,
	nonce: string,
) {
	const { server, createTestClient } = context;

	// default networking: start polling, upgrade to sockets automatically
	const clientA = createTestClient({
		server,
		user: userA,
		nonce: `${nonce}-a`,
		transport: 'pull',
		autoTransport: true,
	});
	const clientB = createTestClient({
		server,
		user: userB,
		nonce: `${nonce}-b`,
		transport: 'pull',
		autoTransport: true,
	});

	clientA.sync.start();
	await waitForSync(clientA);

	clientB.sync.start();
	await waitForSync(clientB);

	await waitForCondition(
		() =>
			clientA.sync.mode === 'realtime' &&
			clientA.sync.isConnected &&
			clientB.sync.mode === 'realtime' &&
			clientB.sync.isConnected,
		10_000,
		() => `A: ${describeSync(clientA)}; B: ${describeSync(clientB)}`,
	);

	// prove realtime sync works both ways over the upgraded sockets
	await clientA.items.put({ id: `${nonce}-from-a`, content: 'from A' });
	await waitForQueryResult(clientB.items.get(`${nonce}-from-a`));
	await clientB.items.put({ id: `${nonce}-from-b`, content: 'from B' });
	await waitForQueryResult(clientA.items.get(`${nonce}-from-b`));

	await clientA.sync.stop();
	await clientB.sync.stop();
}

it('upgrades sequentially started clients of different users from polling to websockets', async () => {
	await startSequentiallyAndExpectUpgrade(
		differentUsersContext,
		'User A',
		'User B',
		'different',
	);
});

it('upgrades sequentially started clients of the same user from polling to websockets', async () => {
	await startSequentiallyAndExpectUpgrade(
		sameUserContext,
		'User C',
		'User C',
		'same',
	);
});

const opPresenceContext = createTestContext({
	library: 'transport-upgrade-op-presence',
});

it('lets a polling client discover new peers when it pushes operations', async () => {
	const { server, createTestClient } = opPresenceContext;

	const clientA = createTestClient({
		server,
		user: 'User A',
		transport: 'pull',
		autoTransport: true,
	});
	// A won't poll again during this test
	clientA.sync.setPullInterval(60_000);
	clientA.sync.start();
	await waitForSync(clientA);

	const clientB = createTestClient({
		server,
		user: 'User B',
		transport: 'pull',
		autoTransport: true,
	});
	clientB.sync.start();
	await waitForSync(clientB);
	// B sees A in its sync response and upgrades
	await waitForCondition(
		() => clientB.sync.mode === 'realtime' && clientB.sync.isConnected,
		5_000,
		() => `B: ${describeSync(clientB)}`,
	);

	expect(clientA.sync.mode).toBe('pull');
	expect(clientA.sync.presence.peerIds).toEqual([]);

	// pushing an operation should return current presence to A
	await clientA.items.put({ content: 'hello' });
	await waitForCondition(
		() => clientA.sync.mode === 'realtime' && clientA.sync.isConnected,
		5_000,
		() => `A: ${describeSync(clientA)}`,
	);
	expect(clientA.sync.presence.peerIds).toEqual(['User B']);

	await clientA.sync.stop();
	await clientB.sync.stop();
});

const sameUserDowngradeContext = createTestContext({
	library: 'transport-upgrade-same-downgrade',
});

it('downgrades to polling when the same user closes their other device', async () => {
	const { server, createTestClient } = sameUserDowngradeContext;

	const clientA = createTestClient({
		server,
		user: 'User D',
		nonce: 'a',
		transport: 'pull',
		autoTransport: true,
	});
	const clientB = createTestClient({
		server,
		user: 'User D',
		nonce: 'b',
		transport: 'pull',
		autoTransport: true,
	});

	clientA.sync.start();
	await waitForSync(clientA);
	clientB.sync.start();
	await waitForSync(clientB);

	await waitForCondition(
		() =>
			clientA.sync.mode === 'realtime' &&
			clientA.sync.isConnected &&
			clientB.sync.mode === 'realtime' &&
			clientB.sync.isConnected,
		10_000,
		() => `A: ${describeSync(clientA)}; B: ${describeSync(clientB)}`,
	);
	expect(clientA.sync.presence.selfReplicaIds.size).toBe(2);

	await clientB.sync.stop();

	await waitForCondition(
		() =>
			clientA.sync.mode === 'pull' &&
			clientA.sync.presence.selfReplicaIds.size === 1,
		5_000,
		() => `A: ${describeSync(clientA)}`,
	);

	await clientA.sync.stop();
});
