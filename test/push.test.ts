import { expect, it, vitest } from 'vitest';
import { createTestContext } from './lib/createTestContext.js';
import { ReplicaType } from '@lo-fi/server';
import {
	waitForCondition,
	waitForOnline,
	waitForQueryResult,
} from './lib/waits.js';
import { assert } from '@a-type/utils';

const context = createTestContext({
	// serverLog: true,
	// keepDb: true,
});

it("doesn't receive back its own ops after pushing them", async () => {
	const logWatcher = vitest.fn();
	const client = await context.createTestClient({
		library: 'push-test',
		user: 'User A',
		type: ReplicaType.Push,
		// this behavior only seems to happen with pull sync
		transport: 'pull',
		onLog: logWatcher,
		// logId: 'A',
	});
	const clientB = await context.createTestClient({
		library: 'push-test',
		user: 'User B',
		// logId: 'B',
	});

	await client.items.put({
		content: 'Apples',
	});
	client.sync.start();

	await waitForOnline(client);

	clientB.sync.start();
	await waitForOnline(clientB);

	const orange = await clientB.items.put({
		content: 'Oranges',
	});

	await waitForQueryResult(client.items.get(orange.get('id')));

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
		// expect(log[0].includes('"baselines": []')).toBe(true);
		logWatcher.mockClear();
	}

	// const log = logWatcher.mock.calls.find((args) =>
	// 	args[0].includes('sync-resp'),
	// );
	// assert(!!log);
	// should not receive info about Apples, which we created
	// expect(!log[0].includes('Apples')).toBe(true);
	logWatcher.mockClear();

	await client.items.put({
		content: 'Bananas',
	});

	await waitAndAssertNoOperationsReturned();

	client.sync.stop();

	await waitForOnline(client, false);

	client.items.put({
		content: 'Pineapples',
	});

	client.sync.start();

	await waitAndAssertNoOperationsReturned();

	clientB.sync.start();
	await waitForOnline(clientB);

	await waitForQueryResult(client.items.get(pears.get('id')));
});
