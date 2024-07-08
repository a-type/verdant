import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { waitForQueryResult } from '../lib/waits.js';
import { assert } from '@verdant-web/common';

const ctx = createTestContext({
	truancyMinutes: 10,
	serverLog: true,
	testLog: true,
});

it('should reset truant replicas upon their reconnection', async () => {
	vi.useFakeTimers();

	const startTime = Date.now();
	vi.setSystemTime(startTime);
	const truantClient = await ctx.createTestClient({
		library: 'truant',
		user: 'truant',
		logId: 'A',
	});

	truantClient.sync.start();
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

	await truantClient.sync.stop();

	vi.setSystemTime(startTime + 5 * 60 * 1000);
	ctx.log('system time set to', startTime + 5 * 60 * 1000);

	const currentClient = await ctx.createTestClient({
		library: 'truant',
		user: 'current',
	});

	currentClient.sync.start();

	const itemsQuery = await waitForQueryResult(
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

	vi.useRealTimers();
});
