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
			logId: 'B',
		});
		clientB.sync.start();

		const a_item = await clientA.items.put({
			content: 'Apples',
		});
		a_item.set('image', createTestFile());
		await waitForFileUpload(a_item.get('image')!);
		const localFileUrl = a_item.get('image')!.url;
		expect(localFileUrl).toBeTruthy();
		expect(localFileUrl?.startsWith('blob:')).toBe(true);
		// when initially uploaded, files have a local blob: URL
		const aFileSnapshot = a_item.get('image')!.getSnapshot();
		expect(aFileSnapshot.url?.startsWith('blob:')).toBe(true);

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

		const bFileSnapshot = file.getSnapshot();
		// after sync, the file URL should be a remote URL, not a blob:
		expect(bFileSnapshot.url).not.toMatch(/^blob/);

		// load the file from the URL and see if it matches.
		// this isn't the same as the original file, but it's good enough to know
		// something was delivered...
		let fileResponse: Response | null = null;
		const fileUrl = bFileSnapshot.url!;
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

		// restart A. when the file is reloaded it should eventually download
		// the remote file info and update with the remote URL in its snapshot
		await clientA.close();
		const clientA2 = await context.createTestClient({
			user: 'User A',
			// logId: 'A2',
		});
		clientA2.sync.start();

		const a2_itemQuery = clientA2.items.get(a_item.get('id'));
		await waitForQueryResult(a2_itemQuery);
		context.log(`item ${a_item.get('id')} reloaded in A2`);
		const a2_item = await a2_itemQuery.resolved;
		assert(!!a2_item);
		await waitForEntityCondition(a2_item, () => !!a2_item.get('image'));
		context.log('image reloaded in A2');
		const a2_file = a2_item.get('image')!;
		await waitForFileLoaded(a2_file);
		context.log('image loaded in A2');
		expect(a2_file.error).toBeNull();
		expect(a2_file.failed).toBe(false);
		expect(a2_file.url).toBeTruthy();

		await waitForCondition(
			() => {
				const snapshot = a2_file.getSnapshot();
				return snapshot.url === bFileSnapshot.url;
			},
			5000,
			'A2 file URL to match B file URL (file remote URL was downloaded)',
		);

		const a2FileSnapshot = a2_file.getSnapshot();
		// after sync, the file URL should be a remote URL, not a blob:
		expect(a2FileSnapshot.url).not.toMatch(/^blob:/);
	},
);
