import { expect, it, vitest } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { waitForMockCall, waitForOnline } from '../lib/waits.js';

const ctx = createTestContext({
	library: 'server-changes-1',
});

// new isolated test server can't do change subscription...
it.skip('notifies of changes on the server', async () => {
	const clientA = await ctx.createTestClient({
		user: 'A',
	});
	const changeHandler = vitest.fn();
	// ctx.server.core.events.subscribe('changes', changeHandler);

	clientA.sync.start();
	await waitForOnline(clientA, true);
	const item1 = await clientA.items.put({ content: 'test' });

	await waitForMockCall(changeHandler, 1);

	const [info, operations, baselines] = changeHandler.mock.calls[0];
	expect(info.libraryId).toBe('server-changes-1');
	expect(info.userId).toBe('A');

	expect(operations.length).toBe(3);
	expect(operations[0].data).toEqual(
		expect.objectContaining({
			op: 'initialize',
		}),
	);
	expect(operations[0].data).toMatchInlineSnapshot(`
		{
		  "op": "initialize",
		  "value": [],
		}
	`);
	expect(operations[1].data).toMatchInlineSnapshot(`
		{
		  "op": "initialize",
		  "value": [],
		}
	`);
	expect(operations[2].data).toEqual({
		op: 'initialize',
		value: {
			id: expect.any(String),
			content: 'test',
			purchased: false,
			categoryId: null,
			tags: expect.anything(),
			comments: expect.anything(),
			image: null,
		},
	});

	changeHandler.mockReset();

	item1.set('content', 'test 2');

	await waitForMockCall(changeHandler, 1);

	const [info2, operations2, baselines2] = changeHandler.mock.calls[0];

	expect(info2.libraryId).toBe('server-changes-1');
	expect(info2.userId).toBe('A');

	expect(operations2.length).toBe(1);
	expect(operations2[0].data).toEqual({
		op: 'set',
		name: 'content',
		value: 'test 2',
	});
});
