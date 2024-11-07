import * as fs from 'fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createTestFile } from '../lib/createTestFile.js';
import { createTestClient } from '../lib/testClient.js';
import { startTestServer } from '../lib/testServer.js';
import {
	waitForEntityCondition,
	waitForFileUpload,
	waitForPeerCount,
	waitForQueryResult,
} from '../lib/waits.js';

let server: ReturnType<typeof startTestServer> extends Promise<infer T>
	? T
	: never;
beforeAll(async () => {
	server = await startTestServer({ log: false, disableRebasing: true });
});

afterAll(() => {
	// delete the ./test-files directory
	try {
		fs.rmSync('./test-files', { recursive: true });
	} catch (e) {
		// ignore
	}
});

afterAll(async () => {
	await server.cleanup();
}, 30 * 1000);

it('the server allows retrieving a document snapshot', async () => {
	FileReader.prototype.readAsDataURL = () => {
		return 'test';
	};

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
		image: createTestFile(),
	});
	await waitForFileUpload(a_apples.get('image')!, 5000);

	// we want these in separate batches just for extra testing
	clientA
		.batch()
		.run(() => {
			a_apples.set('content', 'Apples 2');
		})
		.commit();
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
			a_apples.get('tags').push('a');
		})
		.commit();
	clientA
		.batch()
		.run(() => {
			a_apples.get('comments').delete(1);
		})
		.commit();

	const match = a_apples.getSnapshot() as any;

	// wait for B to get changes, which means they're on the server too
	const bApples = clientB.items.get(a_apples.get('id'));
	await waitForQueryResult(bApples);
	await waitForEntityCondition(
		bApples.current!,
		(doc) => {
			return (
				doc?.get('content') === 'Apples 2' &&
				doc?.get('purchased') === true &&
				doc?.get('comments').length === 1 &&
				!!doc?.get('image')
			);
		},
		5000,
		'Apples 2, purchased, 1 comment, and image',
	);

	// now we can get a snapshot of the document
	const snapshot = await server.server.getDocumentSnapshot(
		library,
		'items',
		a_apples.get('id'),
	);
	expect(snapshot).toBeDefined();
	// should mostly match client-side snapshot of the same data,
	// except the file has more data.
	match.image = {
		id: match.image.id,
		name: 'test.txt',
		type: 'text/plain',
		url: expect.any(String),
	};
	expect(snapshot).toEqual(match);
});
