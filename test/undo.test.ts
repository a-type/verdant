import { expect, it } from 'vitest';
import { createTestContext } from './lib/createTestContext.js';
import {
	waitForCondition,
	waitForOnline,
	waitForPeerCount,
	waitForQueryResult,
} from './lib/waits.js';
import { assert } from '@verdant-web/common';

const context = createTestContext({
	// serverLog: true,
	// keepDb: true,
	// testLog: true,
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
		const log = context.log;

		clientA.sync.start();
		clientB.sync.start();
		await waitForOnline(clientA);
		await waitForOnline(clientB);

		const a_itemA = await clientA.items.put({
			comments: [],
			content: 'Item A',
		});

		await waitForPeerCount(clientA, 1, true);
		log('🔺 --- Online ---');

		const clientB_A = clientB.items.get(a_itemA.get('id'));
		await waitForQueryResult(clientB_A);
		const b_itemA = await clientB_A.resolved;
		expect(b_itemA).toBeTruthy();
		assert(b_itemA);
		log('🔺 --- Client B has item ---');

		clientA.sync.stop();
		clientB.sync.stop();

		await waitForOnline(clientA, false);
		await waitForOnline(clientB, false);

		log('🔺 --- Offline ---');

		log('🔺 --- Client B push ---');

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
		log('🔺 --- Client A push ---');

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

		await waitForOnline(clientA);
		await waitForOnline(clientB);
		await waitForPeerCount(clientA, 1, true);
		log('🔺 --- Online again ---');

		await waitForCondition(() => {
			return a_itemA.get('comments').length === 2;
		});
		expect(a_itemA.get('comments').length).toBe(2);
		expect(a_itemA.get('comments').get(0).get('content')).toBe('Goodbye world');
		expect(a_itemA.get('comments').get(1).get('content')).toBe('Hello world');

		log('🔺 --- Client A undo ---');
		clientA.undoHistory.undo();

		await waitForCondition(() => {
			return a_itemA.get('comments').length === 1;
		});

		expect(a_itemA.get('comments').length).toBe(1);
		expect(a_itemA.get('comments').get(0).get('content')).toBe('Goodbye world');
	},
	20 * 1000,
);
