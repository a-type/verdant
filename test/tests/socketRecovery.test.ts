import { ReplicaType } from '@verdant-web/common';
import { expect, it } from 'vitest';
import type { Item } from '../client/index.js';
import { createTestContext } from '../lib/createTestContext.js';
import {
	waitForCondition,
	waitForOnline,
	waitForQueryResult,
	waitForSync,
} from '../lib/waits.js';

const { server, createTestClient, library } = createTestContext({
	library: 'socket-recovery',
});

it('syncs local changes made while realtime authentication is pending', async () => {
	let releaseAuth!: () => void;
	const authReady = new Promise<void>((resolve) => {
		releaseAuth = resolve;
	});
	const client = createTestClient({
		server,
		user: 'auth-pending',
		fetchAuth: async () => {
			await authReady;
			const response = await fetch(
				`http://localhost:${server.port}/auth/${library}?user=auth-pending&type=${ReplicaType.Realtime}`,
			);
			if (!response.ok)
				throw new Error(`Authentication failed: ${response.status}`);
			return response.json();
		},
	});
	const peer = createTestClient({ server, user: 'auth-pending-peer' });
	await peer.sync.start();
	await waitForSync(peer);
	const started = client.sync.start();
	try {
		await expect(
			client.sync.send({ type: 'heartbeat' }),
		).resolves.toBeUndefined();
		await client.items.put({ content: 'while-auth-pending' });
		await client.entities.flushAllBatches();
	} finally {
		releaseAuth();
	}
	await started;
	await waitForSync(client);
	await waitForQueryResult(peer.items.findAll(), (items) =>
		items.some((item: Item) => item.get('content') === 'while-auth-pending'),
	);
});

it.each(['visibilitychange', 'pageshow', 'online', 'watchdog'] as const)(
	'recovers a closed socket after %s',
	async (trigger) => {
		const sockets: WebSocket[] = [];
		class InterruptedWebSocket extends WebSocket {
			private suppressClose = false;

			get readyState() {
				return this.suppressClose ? WebSocket.CLOSED : super.readyState;
			}

			constructor(url: string | URL, protocols?: string | string[]) {
				super(url, protocols);
				sockets.push(this);
				this.addEventListener('close', (event) => {
					if (this.suppressClose) event.stopImmediatePropagation();
				});
			}

			interrupt() {
				this.suppressClose = true;
				super.close();
			}
		}

		const client = createTestClient({
			server,
			user: `recover-${trigger}`,
			webSocket: InterruptedWebSocket,
		});
		const peer = createTestClient({ server, user: `peer-${trigger}` });
		await client.sync.start();
		await peer.sync.start();
		await waitForSync(client);
		await waitForSync(peer);

		(sockets[0] as InterruptedWebSocket).interrupt();
		await waitForCondition(() => sockets[0].readyState === WebSocket.CLOSED);
		expect(client.sync.status).toBe('active');

		const started = Date.now();
		if (trigger === 'visibilitychange') {
			document.dispatchEvent(new Event('visibilitychange'));
		} else if (trigger !== 'watchdog') {
			window.dispatchEvent(new Event(trigger));
		}

		await waitForCondition(() => sockets.length === 2, 8_000);
		if (trigger !== 'watchdog')
			expect(Date.now() - started).toBeLessThan(4_000);
		await waitForOnline(client);
		await peer.items.put({ content: `after-${trigger}` });
		await peer.entities.flushAllBatches();
		await waitForQueryResult(client.items.findAll(), (items) =>
			items.some((item: Item) => item.get('content') === `after-${trigger}`),
		);
		await client.sync.stop();
		await peer.sync.stop();
	},
);
