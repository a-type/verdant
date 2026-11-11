import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import {
	waitForCondition,
	waitForPeerCount,
	waitForPeerPresence,
	waitForSync,
} from '../lib/waits.js';

const { server, createTestClient } = createTestContext({
	library: 'presence-1',
});

const delayedSnapshotContext = createTestContext({
	library: 'presence-delayed-snapshot',
});

it('keeps new peers when an older initial presence snapshot arrives late', async () => {
	let socket: DelayedSnapshotSocket;
	class DelayedSnapshotSocket extends WebSocket {
		private heldSnapshot: string | undefined;

		constructor(url: string | URL, protocols?: string | string[]) {
			super(url, protocols);
			socket = this;
			this.addEventListener('message', (event) => {
				if (JSON.parse(event.data).type === 'sync-resp' && !this.heldSnapshot) {
					this.heldSnapshot = event.data;
					event.stopImmediatePropagation();
				}
			});
		}

		get hasSnapshot() {
			return this.heldSnapshot !== undefined;
		}

		releaseSnapshot() {
			if (!this.heldSnapshot) throw new Error('No snapshot to release');
			const data = this.heldSnapshot;
			this.dispatchEvent(new MessageEvent('message', { data }));
		}
	}

	const { server, createTestClient } = delayedSnapshotContext;
	const clientA = createTestClient({
		server,
		user: 'A',
		webSocket: DelayedSnapshotSocket,
	});
	const clientB = createTestClient({ server, user: 'B' });
	const clientC = createTestClient({ server, user: 'C' });
	await clientA.sync.start();
	await waitForCondition(() => socket?.hasSnapshot, 10_000);
	clientB.sync.start();
	clientC.sync.start();
	await waitForPeerCount(clientA, 2);

	const snapshotApplied = new Promise<void>((resolve) => {
		const unsubscribe = clientA.sync.presence.subscribe('peersChanged', () => {
			if (clientA.sync.hasSynced) {
				unsubscribe();
				resolve();
			}
		});
	});
	socket!.releaseSnapshot();
	await waitForSync(clientA);
	await snapshotApplied;
	expect(clientA.sync.presence.peerIds).toEqual(['B', 'C']);
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
