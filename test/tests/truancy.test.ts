import { expect, it, vi } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import {
	waitForCondition,
	waitForQueryResult,
	waitForSync,
	waitForTime,
} from '../lib/waits.js';
import { assert } from '@verdant-web/common';
import { getPersistence } from '../lib/persistence.js';

const onServerLog = vi.fn((...args) => {
	// console.log('[server]', ...args);
});
const ctx = createTestContext({
	truancyMinutes: 10,
	serverLog: onServerLog,
	// testLog: true,
});

it('should reset truant replicas upon their reconnection', async () => {
	const library = 'truant';
	const persistence = getPersistence();

	const startTime = Date.now();
	vi.setSystemTime(startTime);
	const truantClient = await ctx.createTestClient({
		library,
		user: 'truant-1',
		persistence,
	});

	await truantClient.sync.start();
	const item1 = await truantClient.items.put({
		content: 'item 1',
	});
	const item2 = await truantClient.items.put({
		content: 'item 2',
	});

	item1.set('purchased', true);
	item2.set('content', 'item 2 updated');

	// that's probably enough to demonstrate...
	await truantClient.entities.flushAllBatches();
	// wait for server to receive the updates
	await waitForCondition(
		() => {
			return (
				onServerLog.mock.calls.length > 0 &&
				onServerLog.mock.calls.some((call) =>
					call.some((arg) => {
						if (typeof arg !== 'string') {
							return false;
						}
						return arg?.includes('item 2 updated');
					}),
				)
			);
		},
		3000,
		'server to receive item 2 update',
	);
	truantClient.sync.stop();

	vi.setSystemTime(startTime + 5 * 60 * 1000);
	ctx.log('system time set to', startTime + 5 * 60 * 1000);

	const currentClient = await ctx.createTestClient({
		library,
		user: 'current-1',
		persistence,
		// logId: 'current',
	});

	await currentClient.sync.start();

	await waitForQueryResult(
		currentClient.items.findAll(),
		(r) => r.length === 2,
	);
	const currentItem1 = await currentClient.items.get(item1.get('id')).resolved;
	assert(currentItem1);
	currentItem1.set('content', 'item 1 updated');

	const currentItem3 = await currentClient.items.put({
		content: 'item 3',
	});

	await currentClient.entities.flushAllBatches();

	vi.setSystemTime(startTime + 15 * 60 * 1000);
	ctx.log('system time set to', startTime + 15 * 60 * 1000);

	ctx.log('Restarting truant client');

	const onReset = vi.fn();
	truantClient.subscribe('resetToServer', onReset);
	await truantClient.sync.start();

	const itemsQuery3 = truantClient.items.get(currentItem3.get('id'));
	await waitForQueryResult(itemsQuery3);
	// this will indicate the replica was found truant and reset.
	expect(onReset).toHaveBeenCalled();

	const item3 = await itemsQuery3.resolved;

	expect(item1.getSnapshot()).toEqual(currentItem1.getSnapshot());
	expect(item3?.getSnapshot()).toEqual(currentItem3.getSnapshot());
});

it('should not reset truant replicas with up to date server order', async () => {
	const library = 'truant-up-to-date';
	const persistence = getPersistence();

	const startTime = Date.now();
	vi.setSystemTime(startTime);
	const truantClient = await ctx.createTestClient({
		library,
		user: 'truant-2',
		// logId: 'truant',
		persistence,
	});

	await truantClient.sync.start();
	const item1 = await truantClient.items.put({
		content: 'item 1',
	});
	const item2 = await truantClient.items.put({
		content: 'item 2',
	});

	item1.set('purchased', true);
	item2.set('content', 'item 2 updated');

	// that's probably enough to demonstrate...
	await truantClient.entities.flushAllBatches();
	// wait for server to receive the updates
	await waitForCondition(
		() => {
			return (
				onServerLog.mock.calls.length > 0 &&
				onServerLog.mock.calls.some((call) =>
					call.some((arg) => {
						if (typeof arg !== 'string') {
							return false;
						}
						return arg?.includes('item 2 updated');
					}),
				)
			);
		},
		3000,
		'server to receive item 2 update',
	);
	truantClient.sync.stop();

	vi.setSystemTime(startTime + 5 * 60 * 1000);
	ctx.log('system time set to', startTime + 5 * 60 * 1000);

	const currentClient = await ctx.createTestClient({
		library,
		user: 'current-2',
		persistence,
		// logId: 'current',
	});

	// simulate another replica going online, but not pushing any changes
	await currentClient.sync.start();
	await waitForQueryResult(
		currentClient.items.findAll(),
		(r) => r.length === 2,
	);

	vi.setSystemTime(startTime + 15 * 60 * 1000);
	ctx.log('system time set to', startTime + 15 * 60 * 1000);

	ctx.log('Restarting truant client');

	const onReset = vi.fn();
	truantClient.subscribe('resetToServer', onReset);

	// push some preemptive changes before sync, to simulate the truant client immediately
	// making changes on launch
	const item3 = await truantClient.items.put({
		content: 'item 3',
	});
	item3.set('content', 'item 3 updated');
	await truantClient.entities.flushAllBatches();

	await truantClient.sync.start();
	await waitForSync(truantClient);

	await waitForQueryResult(truantClient.items.findAll(), (r) => r.length === 3);

	await waitForTime(300);
	// this would indicate the replica was found truant and reset.
	expect(onReset).not.toHaveBeenCalled();
});
