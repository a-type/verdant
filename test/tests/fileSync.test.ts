import { assert } from '@a-type/utils';
import { afterAll, expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { createTestFile } from '../lib/createTestFile.js';
import {
	waitForCondition,
	waitForEntityCondition,
	waitForQueryResult,
} from '../lib/waits.js';
import * as fs from 'fs';

const context = createTestContext({
	// serverLog: true,
});

afterAll(() => {
	// delete the ./test-files directory
	try {
		fs.rmSync('./test-files', { recursive: true });
	} catch (e) {
		// console.log(e);
	}
});

it(
	'can sync files between replicas',
	async () => {
		FileReader.prototype.readAsDataURL = () => {
			return 'test';
		};
		const clientA = await context.createTestClient({
			library: 'file-sync-1',
			user: 'User A',
			// logId: 'A',
		});
		clientA.sync.start();

		const clientB = await context.createTestClient({
			library: 'file-sync-1',
			user: 'User B',
			// logId: 'B',
		});
		clientB.sync.start();

		const a_item = await clientA.items.put({
			content: 'Apples',
		});
		a_item.set('image', createTestFile());

		const b_itemQuery = clientB.items.get(a_item.get('id'));
		await waitForQueryResult(b_itemQuery);
		context.log(`⭐️ item ${a_item.get('id')} synced to B`);
		const b_item = await b_itemQuery.resolved;
		assert(!!b_item);
		await waitForEntityCondition(b_item, () => !!b_item.get('image'));
		context.log('⭐️ image synced to B');
		const file = b_item.get('image')!;
		await waitForCondition(() => !file.loading);
		context.log('⭐️ image loaded');
		expect(file.failed).toBe(false);
		expect(file.url).toBeTruthy();

		// load the file from the URL and see if it matches.
		// this isn't the same as the original file, but it's good enough to know
		// something was delivered...
		let fileResponse: Response | null = null;
		await waitForCondition(async () => {
			fileResponse = await fetch(file.url!);
			return fileResponse.status !== 404;
		});
		context.log('⭐️ image fetched');
		const blob = await fileResponse!.blob();
		const text = await blob.text();
		context.log(`⭐️ image blob: ${text}`);
		if (blob.size !== 0) {
			console.error('⚠️ Unexpected blob', blob.size, text);
		}
		expect(blob.size).toBe(0);
		expect(blob.type?.replace(/\s+/g, '')).toBe('text/plain;charset=utf-8');
	},
	{
		timeout: 15000,
		// retry: 2,
	},
);
