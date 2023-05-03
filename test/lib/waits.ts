import { expect, Mock } from 'vitest';
import { Client, Query } from '../client/index.js';

export async function waitForMockCall(mock: Mock, calls = 1) {
	return new Promise<void>((resolve) => {
		setInterval(() => {
			if (mock.mock.calls.length >= calls) {
				resolve();
			}
		}, 100);
	});
}

export async function waitForOnline(client: Client, online = true) {
	return new Promise<void>((resolve) => {
		if (client.sync.isConnected) {
			resolve();
			return;
		}
		client.sync.subscribe('onlineChange', (isOnline) => {
			if (isOnline === online) resolve();
		});
	});
}

export function waitForPeerCount(client: Client, count: number, gte = false) {
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

export async function waitForQueryResult(
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

	expect(predicate(query.current)).toBe(true);
}

export async function waitForEverythingToRebase(client: Client) {
	await new Promise<void>((resolve) => {
		setInterval(async () => {
			if ((await client.stats()).meta.operationsSize.count === 0) {
				resolve();
			}
		}, 300);
	});
}

export async function waitForBaselineCount(client: Client, count = 1) {
	await new Promise<void>((resolve) => {
		setInterval(async () => {
			const stats = await client.stats();
			if (stats.meta.baselinesSize.count >= count) {
				resolve();
			}
		}, 300);
	});
}

export async function waitForCondition(
	condition: () => boolean | Promise<boolean>,
	timeout?: number,
) {
	await new Promise<void>((resolve, reject) => {
		if (timeout) {
			setTimeout(() => {
				reject(new Error('Timed out waiting for condition'));
			}, timeout);
		}

		async function run() {
			try {
				let result = condition();
				if (result instanceof Promise) {
					result = await result;
				}
				if (result) {
					resolve();
				} else {
					setTimeout(run, 300);
				}
			} catch (e) {
				reject(e);
			}
		}
		run();
	});
}

export async function waitForPeerPresence(
	client: Client,
	peerId: string,
	predicate: (presence: any) => boolean = (presence) => {
		return !!presence;
	},
) {
	await new Promise<void>((resolve, reject) => {
		if (predicate(client.sync.presence.peers[peerId]?.presence)) {
			resolve();
			return;
		}

		const timeout = setTimeout(() => {
			reject(new Error('Timed out waiting for peer presence'));
		}, 15000);
		const unsubscribe = client.sync.presence.subscribe(
			'peerChanged',
			(otherId, info) => {
				if (peerId === otherId && predicate(info?.presence)) {
					unsubscribe();
					clearTimeout(timeout);
					resolve();
				}
			},
		);
	});
	expect(predicate(client.sync.presence.peers[peerId]?.presence)).toBe(true);
}
