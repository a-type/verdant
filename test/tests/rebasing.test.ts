import { ReplicaType } from '@verdant-web/common';
import { expect, it, vi } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import {
	waitForBaselineCount,
	waitForEntityCondition,
	waitForEverythingToRebase,
	waitForMockCall,
	waitForOnline,
	waitForPeerCount,
	waitForQueryResult,
	waitForTime,
} from '../lib/waits.js';

it('an offline client rebases everything', async () => {
	const context = createTestContext({
		// serverLog: true,
		// testLog: true,
		library: 'offline_rebase',
	});
	const client = await context.createGenericClient({
		user: 'A1',
	});

	const produce = await client.categories.put({
		name: 'Produce',
	});
	const apples = await client.items.put({
		content: 'Apples',
		categoryId: produce.get('id'),
	});
	apples.get('comments').push({
		content: 'Yum',
		authorId: 'Anon',
	});
	apples.set('purchased', true);
	const oranges = await client.items.put({
		content: 'Oranges',
		categoryId: produce.get('id'),
	});
	oranges.get('tags').push('a');
	oranges.get('comments').push({
		content: 'Do not eat the peel',
		authorId: 'Anon',
	});
	oranges.get('comments').delete(0);
	oranges.set('purchased', true);
	oranges.set('purchased', false);

	// now we wait for everything to settle.
	await waitForEverythingToRebase(client);
	expect((await client.stats()).meta.operationsSize.count).toBe(0);
});

it('passive clients do not interfere with rebasing when offline', async () => {
	const onClientARebase = vi.fn();
	const context = createTestContext({
		library: 'rebase-passive-1',
	});
	const clientA = await context.createTestClient({
		user: 'User A',
	});
	clientA.subscribe('rebase', onClientARebase);
	const onClientBRebase = vi.fn();
	const clientB = await context.createTestClient({
		user: 'User B',
	});
	clientB.subscribe('rebase', onClientBRebase);
	const onClientCRebase = vi.fn();
	const clientC = await context.createTestClient({
		user: 'User C',
		type: ReplicaType.PassiveRealtime,
	});
	clientC.subscribe('rebase', onClientCRebase);

	clientA.sync.start();
	clientB.sync.start();
	clientC.sync.start();

	await waitForPeerCount(clientA, 2);

	clientA.categories.put({
		name: 'Produce',
	});
	clientA.items.put({
		content: 'Apples',
	});
	clientC.items.put({
		content: 'Oranges',
	});

	context.log('🔺 --- Waiting for all realtime changes to rebase ---');
	await waitForMockCall(onClientARebase, 1, 'client a rebase');
	await waitForBaselineCount(clientA, 4, 'client a 4 baselines');
	await waitForMockCall(onClientBRebase, 1, 'client b rebase');
	await waitForBaselineCount(clientB, 4, 'client b 4 baselines');
	await waitForMockCall(onClientCRebase, 1, 'client c rebase');
	await waitForBaselineCount(clientC, 4, 'client c 4 baselines');

	context.log('🔺 --- Disconnecting passive replica ---');
	await clientC.sync.stop();

	const oranges = await clientA.items.put({
		content: 'Oranges',
	});
	oranges.set('purchased', true);
	await clientB.items.put({
		content: 'Bananas',
	});

	context.log('🔺 --- Waiting for all new changes to rebase ---');
	await waitForBaselineCount(clientA, 10);
	await waitForBaselineCount(clientB, 10);

	// actual numbers here aren't the most important, just that the baselines are
	// created even though client C is offline.

	expect(
		(await clientA.stats()).meta.baselinesSize.count,
	).toBeGreaterThanOrEqual(10);
	expect(
		(await clientB.stats()).meta.baselinesSize.count,
	).toBeGreaterThanOrEqual(10);

	// can client C come back online and sync up to the latest state?
	context.log('🔺 --- Reconnecting passive replica ---');
	clientC.sync.start();
	const queryCOranges = clientC.items.get(oranges.get('id'));
	await waitForQueryResult(queryCOranges);
	await waitForEntityCondition(
		queryCOranges.current!,
		(res) => !!res?.get('purchased'),
	);
	expect(queryCOranges.current!.get('purchased')).toBe(true);
});

it("server does not rebase old offline operations that haven't yet synced to online replicas", async () => {
	const context = createTestContext({
		library: 'old-rebase-sync-1',
	});
	const clientA = await context.createTestClient({
		user: 'A',
	});
	const clientB = await context.createTestClient({
		user: 'B',
	});

	clientA.sync.start();
	clientA.items.put({
		id: '1',
		content: 'Item 1',
	});
	// we want to make sure A 'wins' the library
	await waitForOnline(clientA);

	clientB.sync.start();
	await waitForPeerCount(clientA, 1);
	await waitForPeerCount(clientB, 1);
	await waitForQueryResult(
		clientB.items.get('1'),
		(res) => !!res,
		2000,
		'b should see item 1',
	);

	clientB.items.put({
		id: '2',
		content: 'Item 2',
	});
	await waitForQueryResult(clientA.items.get('2'));

	await clientA.sync.stop();

	await waitForTime(500);

	clientA.items.put({
		id: '3',
		content: 'Item 3',
	});

	await waitForTime(200);

	clientB.items.put({
		id: '4',
		content: 'Item 4',
	});

	// b goes offline, but only after it's sent a new operation
	// which is after item 3. if we only went by timestamp, b
	// has "seen" 3, but it hasn't.
	await clientB.sync.stop();
	await waitForTime(500);

	clientA.sync.start();

	await waitForTime(500);

	clientB.sync.start();

	await waitForQueryResult(clientB.items.get('3'));
	await waitForQueryResult(clientB.items.get('4'));
	await waitForQueryResult(clientA.items.get('4'));
});
