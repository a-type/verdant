import { assert } from '@a-type/utils';
import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { createTestFile } from '../lib/createTestFile.js';
import {
	waitForCondition,
	waitForEntityCondition,
	waitForFileLoaded,
	waitForFileUpload,
	waitForQueryResult,
} from '../lib/waits.js';

const context = createTestContext({
	// testLog: true,
	library: 'file-sync-1',
});

it(
	'can sync files between replicas',
	{
		timeout: 15000,
		retry: 1,
	},
	async () => {
		// FileReader.prototype.readAsDataURL = () => {
		// 	return 'test';
		// };
		const clientA = await context.createTestClient({
			user: 'User A',
			// logId: 'A',
		});
		clientA.sync.start();

		const clientB = await context.createTestClient({
			user: 'User B',
			// logId: 'B',
		});
		clientB.sync.start();

		const a_item = await clientA.items.put({
			content: 'Apples',
		});
		a_item.set('image', createTestFile());
		await waitForFileUpload(a_item.get('image')!);

		const b_itemQuery = clientB.items.get(a_item.get('id'));
		await waitForQueryResult(b_itemQuery);
		context.log(`item ${a_item.get('id')} synced to B`);
		const b_item = await b_itemQuery.resolved;
		assert(!!b_item);
		await waitForEntityCondition(b_item, () => !!b_item.get('image'));
		context.log('image synced to B');
		const file = b_item.get('image')!;
		await waitForFileLoaded(file);
		context.log('image loaded');
		expect(file.error).toBeNull();
		expect(file.failed).toBe(false);
		expect(file.url).toBeTruthy();

		// load the file from the URL and see if it matches.
		// this isn't the same as the original file, but it's good enough to know
		// something was delivered...
		let fileResponse: Response | null = null;
		const fileUrl = `http://localhost:${context.server.port}/files/${context.library}/${file.id}/test.txt`;
		await waitForCondition(
			async () => {
				console.log('fetching', fileUrl);
				try {
					fileResponse = await fetch(fileUrl);
					return fileResponse.status !== 404;
				} catch (e) {
					console.log('fetch error', e);
					return false;
				}
			},
			5000,
			async () => {
				const text = await fileResponse!.text();
				return `image fetch failed: ${text}`;
			},
		);
		context.log('image fetched');
		const blob = await fileResponse!.blob();
		const text = await blob.text();
		context.log(`image blob: ${text}`);
		expect(blob.type?.replace(/\s+/g, '')).toContain('text/plain');
	},
);
