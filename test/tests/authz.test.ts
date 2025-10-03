import { authorization } from '@verdant-web/store';
import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { waitForEntityCondition, waitForQueryResult } from '../lib/waits.js';

const ctx = createTestContext({
	// serverLog: true,
	library: 'authz',
});

it('doesnt sync authorized docs to other users', async () => {
	const userA1 = await ctx.createTestClient({
		user: 'A',
	});
	userA1.sync.start();

	const userA2 = await ctx.createTestClient({
		user: 'A',
	});

	const userB = await ctx.createTestClient({
		user: 'B',
	});

	const privateItem = await userA1.items.put(
		{
			content: 'private item',
		},
		{
			access: authorization.private,
		},
	);
	expect(privateItem.isAuthorized).toBe(true);

	const publicItem = await userA1.items.put({
		content: 'public item',
	});

	userA2.sync.start();
	userB.sync.start();

	await waitForQueryResult(userA2.items.get(privateItem.get('id')));
	const privateItemOnA2 = (await userA2.items.get(privateItem.get('id'))
		.resolved)!;
	expect(privateItemOnA2.isAuthorized).toBe(true);
	await waitForQueryResult(userB.items.get(publicItem.get('id')));

	const bSeesPrivateItemQuery = userB.items.get(privateItem.get('id'));
	expect(await bSeesPrivateItemQuery.resolved).toBeNull();
	// make sure this never appears.
	bSeesPrivateItemQuery.subscribe('change', (val) => {
		expect(val).toBeNull();
	});

	privateItem.set('purchased', true);
	privateItem.set('comments', []);
	privateItem.get('comments').push({ authorId: 'A', content: 'private' });

	await waitForEntityCondition(
		privateItemOnA2,
		(e) => e.get('comments').length === 1,
		2000,
		'A2 sees comment',
	);

	expect(await userB.items.get(privateItem.get('id')).resolved).toBeNull();

	// join a new related replica and unrelated replica to ensure
	// that new replicas don't get anythign they shouldn't
	const userA3 = await ctx.createTestClient({
		user: 'A',
	});
	userA3.sync.start();

	const userC = await ctx.createTestClient({
		user: 'C',
	});
	userC.sync.start();

	await waitForQueryResult(userA3.items.get(privateItem.get('id')));
	await waitForQueryResult(userC.items.get(publicItem.get('id')));

	expect(await userC.items.get(privateItem.get('id')).resolved).toBeNull();
});
