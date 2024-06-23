import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { createTestFile } from '../lib/createTestFile.js';
import {
	waitForCondition,
	waitForEntityCondition,
	waitForFileUpload,
} from '../lib/waits.js';
import { assert } from '@verdant-web/common';

const ctx = createTestContext({
	// serverLog: true,
});

it('supports the server requesting more history if it has lost data', async () => {
	FileReader.prototype.readAsDataURL = () => {
		return 'test';
	};

	const client = await ctx.createTestClient({
		library: 'need-more',
		user: 'A',
		// logId: 'A',
	});

	client.sync.start();

	// create some data
	const itemA = await client.items.put({
		id: 'a',
		content: 'A',
	});

	// including files
	const file = createTestFile();
	itemA.set('image', file);
	const image = itemA.get('image')!;

	await waitForFileUpload(image);

	client.sync.stop();

	const fileData = await ctx.server.server.getFileData('need-more', image.id);
	expect(fileData).not.toBeNull();

	await ctx.server.server.evictLibrary('need-more');

	await waitForCondition(
		async () => {
			return (await ctx.server.server.getLibraryInfo('need-more')) === null;
		},
		5000,
		() => {
			return 'library evicted';
		},
	);

	// check that file was deleted
	let fileResponse: Response | null = null;
	await waitForCondition(
		async () => {
			try {
				fileResponse = await fetch(fileData.url!);
				return fileResponse.status === 404;
			} catch (e) {
				return false;
			}
		},
		5000,
		'file delete',
	);

	// restart sync. the server should request the full history,
	// and the file should be re-uploaded
	client.sync.start();

	await waitForCondition(
		async () => {
			return !!(await ctx.server.server.getLibraryInfo('need-more'));
		},
		5000,
		'library restored',
	);

	await waitForCondition(
		async () => {
			try {
				fileResponse = await fetch(fileData.url!);
				return fileResponse.status === 404;
			} catch (e) {
				return false;
			}
		},
		5000,
		'file reupload',
	);
});
