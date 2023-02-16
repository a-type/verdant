import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestClient } from './lib/testClient.js';
import { startTestServer } from './lib/testServer.js';
import { waitForPeerCount, waitForQueryResult } from './lib/waits.js';

let server: ReturnType<typeof startTestServer> extends Promise<infer T>
	? T
	: never;
beforeAll(async () => {
	server = await startTestServer({ log: false });
});

afterAll(async () => {
	await server.cleanup();
}, 30 * 1000);

describe('the server', () => {
	it('allows retrieving a document snapshot', async () => {
		const library = 'snapshot-1';

		const clientA = await createTestClient({
			server,
			library,
			user: 'User A',
		});
		const clientB = await createTestClient({
			server,
			library,
			user: 'User B',
			// logId: 'B',
		});

		// seed data into library
		clientA.sync.start();
		clientB.sync.start();
		await waitForPeerCount(clientA, 1, true);

		const a_produceCategory = await clientA.categories.put({
			name: 'Produce',
		});
		const a_apples = await clientA.items.put({
			categoryId: a_produceCategory.get('id'),
			content: 'Apples',
		});
		const b_oranges = await clientB.items.put({
			categoryId: a_produceCategory.get('id'),
			content: 'Oranges',
		});

		// we want these in separate batches just for extra testing
		clientA
			.batch()
			.run(() => {
				a_apples.set('content', 'Apples 2');
			})
			.flush();
		clientA
			.batch()
			.run(() => {
				a_apples.set('purchased', true);
				a_apples.get('comments').push({
					authorId: 'me',
					content: 'Yum',
				});
				a_apples.get('comments').push({
					authorId: 'me',
					content: 'Yum again',
				});
				a_apples.get('tags').push('fruit');
			})
			.flush();
		clientA
			.batch()
			.run(() => {
				a_apples.get('comments').delete(1);
			})
			.flush();

		// wait for B to get changes, which means they're on the server too
		await waitForQueryResult(clientB.items.get(a_apples.get('id')), (doc) => {
			return (
				doc?.get('content') === 'Apples 2' &&
				doc?.get('purchased') === true &&
				doc?.get('comments').length === 1
			);
		});

		// now we can get a snapshot of the document
		const snapshot = server.server.getDocumentSnapshot(
			library,
			'items',
			a_apples.get('id'),
		);
		expect(snapshot).toBeDefined();
		// should match client-side snapshot of the same data
		expect(snapshot).toEqual(a_apples.getSnapshot());
	});
});
