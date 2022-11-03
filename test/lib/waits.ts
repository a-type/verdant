import { Mock } from 'vitest';
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

export function waitForPeerCount(client: Client, count: number) {
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
				if (Object.keys(peers).length === count) {
					unsubscribe();
					clearTimeout(timeout);
					resolve();
				}
			},
		);
	});
}

export function waitForQueryResult(
	query: Query<any>,
	predicate: (value: any) => boolean = (value) => {
		return !!value && (Array.isArray(value) ? value.length > 0 : true);
	},
) {
	return new Promise<void>((resolve, reject) => {
		if (predicate(query.current)) {
			resolve();
			return;
		}

		const timeout = setTimeout(() => {
			reject(new Error('Timed out waiting for query ' + query.key));
		}, 10000);
		const unsubscribe = query.subscribe((result) => {
			if (predicate(query.current)) {
				unsubscribe();
				clearTimeout(timeout);
				resolve();
			}
		});
	});
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

export async function waitForCondition(condition: () => boolean) {
	await new Promise<void>((resolve) => {
		setInterval(() => {
			if (condition()) {
				resolve();
			}
		}, 300);
	});
}
