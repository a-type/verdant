import { assert } from '@a-type/utils';
import { ReplicaType } from '@verdant-web/server';
import { expect, it, vitest } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import {
	waitForCondition,
	waitForQueryResult,
	waitForSync,
} from '../lib/waits.js';

const context = createTestContext({
	library: 'push-sync',
});

it("doesn't receive back its own ops after pushing them", async () => {
	const logWatcher = vitest.fn((...args) => {
		// console.log('[A]', ...args);
	});
	const client = await context.createTestClient({
		user: 'User A',
		type: ReplicaType.Push,
		// this behavior only seems to happen with pull sync
		transport: 'pull',
		onLog: logWatcher,
	});
	const clientB = await context.createTestClient({
		user: 'User B',
	});

	await client.items.put({
		id: 'apples',
		content: 'Apples',
	});
	client.sync.start();

	await waitForSync(client);
	context.log('Client 1 online');

	clientB.sync.start();
	await waitForSync(clientB);
	context.log('Client 2 online');

	const orange = await clientB.items.put({
		id: 'oranges',
		content: 'Oranges',
	});

	await waitForQueryResult(client.items.get(orange.get('id')));
	context.log('Client 1 received oranges');

	clientB.sync.stop();
	// await waitForOnline(clientB, false);

	const pears = await clientB.items.put({
		content: 'Pears',
	});

	async function waitAndAssertNoOperationsReturned() {
		await waitForCondition(() => {
			return logWatcher.mock.calls.some((args) => {
				return (
					args[0].includes('sync-resp') &&
					args[0].includes('\\"operations\\": []')
				);
			});
		});

		const log = logWatcher.mock.calls.find(
			(args) =>
				args[0].includes('sync-resp') &&
				args[0].includes('\\"operations\\": []'),
		);
		assert(!!log);

		expect(log[0].includes('\\"operations\\": []')).toBe(true);
		logWatcher.mockClear();
	}

	logWatcher.mockClear();

	await client.items.put({
		id: 'bananas',
		content: 'Bananas',
	});

	context.log('Begin wait for no operations 1');
	await waitAndAssertNoOperationsReturned();
	context.log('End wait for no operations 1');

	client.sync.stop();
	context.log('Client 1 offline');

	client.items.put({
		id: 'pineapples',
		content: 'Pineapples',
	});
	await client.entities.flushAllBatches();

	client.sync.start();

	await waitForSync(client);
	context.log('Client 1 online again');

	context.log('Begin wait for no operations 2');
	await waitAndAssertNoOperationsReturned();
	context.log('End wait for no operations 2');

	clientB.sync.start();
	await waitForSync(clientB);

	// this seems to time out sometimes?
	await waitForQueryResult(client.items.get(pears.get('id')));
	context.log('Client 1 received pears');
	client.close();
	clientB.close();
});
