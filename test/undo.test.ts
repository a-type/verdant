import { expect, it } from 'vitest';
import { createTestContext } from './lib/createTestContext.js';
import {
	waitForCondition,
	waitForPeerCount,
	waitForQueryResult,
} from './lib/waits.js';

const context = createTestContext({
	// serverLog: true,
	// keepDb: true,
});

it(
	'can undo a push of an object even if another push has happened since',
	async () => {
		const clientA = await context.createTestClient({
			library: 'sync-1',
			user: 'User A',
			// logId: 'A',
		});
		const clientB = await context.createTestClient({
			library: 'sync-1',
			user: 'User B',
			// logId: 'B',
		});

		clientA.sync.start();
		clientB.sync.start();

		const a_itemA = await clientA.items.create({
			comments: [],
			content: 'Item A',
		});
		a_itemA.get('id');

		await waitForPeerCount(clientA, 1, true);
		console.log('🔺 --- Online ---');

		await waitForQueryResult(clientB.items.get(a_itemA.get('id')));
		const b_itemA = await clientB.items.get(a_itemA.get('id')).resolved;

		clientA.sync.stop();
		clientB.sync.stop();

		await waitForCondition(() => !clientA.sync.isConnected);
		await waitForCondition(() => !clientB.sync.isConnected);

		console.log('🔺 --- Offline ---');

		console.log('🔺 --- Client B push ---');

		clientB
			.batch()
			.run(() => {
				b_itemA.get('comments').push({
					authorId: 'user-b',
					content: 'Goodbye world',
				});
			})
			.flush();

		await new Promise((resolve) => setTimeout(resolve, 100));
		console.log('🔺 --- Client A push ---');

		clientA
			.batch()
			.run(() => {
				a_itemA.get('comments').push({
					authorId: 'user-a',
					content: 'Hello world',
				});
			})
			.flush();

		clientA.sync.start();
		clientB.sync.start();

		await waitForPeerCount(clientA, 1, true);
		console.log('🔺 --- Online again ---');

		await waitForCondition(() => {
			return a_itemA.get('comments').length === 2;
		});
		expect(a_itemA.get('comments').length).toBe(2);
		expect(a_itemA.get('comments').get(0).get('content')).toBe('Goodbye world');
		expect(a_itemA.get('comments').get(1).get('content')).toBe('Hello world');

		console.log('🔺 --- Client A undo ---');
		clientA.undoHistory.undo();

		await waitForCondition(() => {
			return a_itemA.get('comments').length === 1;
		});

		expect(a_itemA.get('comments').length).toBe(1);
		expect(a_itemA.get('comments').get(0).get('content')).toBe('Goodbye world');
	},
	20 * 1000,
);
