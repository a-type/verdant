import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { createTestFile } from '../lib/createTestFile.js';
import { waitForCondition, waitForFileUpload } from '../lib/waits.js';

const ctx = createTestContext({
	library: 'need-more',
});

it('supports the server requesting more history if it has lost data', async () => {
	// FileReader.prototype.readAsDataURL = () => {
	// 	return 'test';
	// };

	const client = await ctx.createTestClient({
		user: 'A',
		// logId: 'A',
	});

	client.sync.start();

	// create some data
	const itemA = await client.items.put({
		id: 'a',
		content: 'A',
	});
	ctx.log('Created item A');

	// including files
	const file = createTestFile();
	itemA.set('image', file);
	const image = itemA.get('image')!;
	ctx.log('Set image on item A');

	await client.entities.flushAllBatches();
	ctx.log('Flushed changes');

	await waitForFileUpload(image, 5_000);

	await client.sync.stop();

	const fileData = await ctx.server.getFileInfo(ctx.library, image.id);
	expect(fileData).not.toBeNull();

	await ctx.server.evict(ctx.library);

	await waitForCondition(
		async () => {
			const lib = await ctx.server.info(ctx.library);
			return lib === null;
		},
		5000,
		() => {
			return 'library evicted';
		},
	);

	// check that file was deleted

	let fileResponse: Response | null = null;
	// TODO: restore this check when file uploads are supported in test env again
	// await waitForCondition(
	// 	async () => {
	// 		try {
	// 			fileResponse = await fetch(fileData.url!);
	// 			return fileResponse.status === 404;
	// 		} catch (e) {
	// 			return false;
	// 		}
	// 	},
	// 	5000,
	// 	'file delete',
	// );

	// restart sync. the server should request the full history,
	// and the file should be re-uploaded
	await client.sync.start();

	await waitForCondition(
		async () => {
			const lib = await ctx.server.info(ctx.library);
			return !!lib;
		},
		5000,
		'library restored',
	);

	// TODO: restore this check when file uploads are supported in test env again
	// await waitForCondition(
	// 	async () => {
	// 		try {
	// 			fileResponse = await fetch(fileData.url!);
	// 			return fileResponse.status === 404;
	// 		} catch (e) {
	// 			return false;
	// 		}
	// 	},
	// 	5000,
	// 	'file reupload',
	// );
});
