import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { waitForCondition, waitForOnline } from '../lib/waits.js';

const ctx = createTestContext({
	// test will observe total number of operations synced
	disableRebasing: true,
	// testLog: true,
	// serverLog: true,
});

it('overwrites superseded operations to the same key before syncing', async () => {
	const clientA = await ctx.createTestClient({
		library: 'superseding',
		user: 'A',
		// logId: 'A',
	});

	const item = await clientA.items.put({
		content: 'Apples',
	});
	// wait a beat to allow these changes to rebase
	await waitForCondition(async () => {
		const stats = await clientA.stats();
		return stats.meta.operationsSize.count === 0;
	});
	// the client will sync only baselines, leaving us a clean
	// slate to observe the superseding behavior
	clientA.sync.start();
	await waitForOnline(clientA);

	await clientA
		.batch()
		.run(() => {
			for (let i = 0; i < 10; i++) {
				item.set('content', `${i} apples`);
			}
		})
		.commit();

	// wait for the sync to complete
	const lib = await ctx.server.core.get('superseding');
	await waitForCondition(async () => {
		return !!(await lib.getInfo());
	});

	ctx.log('checking server library');
	let stats = await lib.getInfo();
	expect(stats?.operationsCount).toBe(1);

	await clientA
		.batch()
		.run(() => {
			// test for interference with other operations
			item.set('purchased', true);
			for (let i = 0; i < 10; i++) {
				item.set('categoryId', `${i}`);
			}
			// test delete supersedes sets
			item.delete('categoryId');
		})
		.commit();

	await waitForCondition(async () => {
		stats = await lib.getInfo();
		return stats?.operationsCount === 3;
	});

	stats = await lib.getInfo();
	// +1 for write of categoryId, +1 for write of purchased
	expect(stats?.operationsCount).toBe(3);
});

it('superseding handles list items moving around', async () => {
	const clientA = await ctx.createTestClient({
		library: 'superseding2',
		user: 'A',
	});

	const item = await clientA.items.put({
		content: 'Apples',
		tags: ['a', 'b'],
	});

	await clientA
		.batch()
		.run(() => {
			const tags = item.get('tags');
			tags.set(1, 'c');
			tags.delete(1);
			tags.delete(0);
			tags.add('a');
			tags.set(0, 'b');
			tags.delete(0);
		})
		.commit();

	expect(item.get('tags').getSnapshot()).toHaveLength(0);
});
