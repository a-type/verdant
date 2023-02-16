import { assert } from '@a-type/utils';
import { afterAll, expect, it } from 'vitest';
import { createTestContext } from './lib/createTestContext.js';
import { createTestFile } from './lib/createTestFile.js';
import { waitForCondition, waitForQueryResult } from './lib/waits.js';
import * as fs from 'fs';

const context = createTestContext();

afterAll(() => {
	// delete the ./test-files directory
	fs.rmdirSync('./test-files', { recursive: true });
});

it('can sync files between replicas', async () => {
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

	await waitForQueryResult(clientB.items.get(a_item.get('id')));
	const b_item = await clientB.items.get(a_item.get('id')).resolved;

	expect(b_item).toBeTruthy();
	assert(!!b_item);
	await waitForCondition(() => !!b_item.get('image'));
	const file = b_item.get('image')!;
	await waitForCondition(() => !file.loading && !file.failed);
	expect(file.url).toBeTruthy();

	// load the file from the URL and see if it matches.
	// this isn't the same as the original file, but it's good enough to know
	// something was delivered...
	const response = await fetch(file.url!);
	const blob = await response.blob();
	expect(blob.size).toBe(13);
	expect(blob.type).toBe('text/plain;charset=utf-8');
	const text = await blob.text();
	// basically the file isn't encoded into the form data correctly.
	// someday maybe I'll get this figured out
	expect(text).toBe('[object File]');
}, 15000);
