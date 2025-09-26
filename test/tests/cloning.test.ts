import { assert } from '@verdant-web/common';
import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { createTestFile } from '../lib/createTestFile.js';
import { getPersistence } from '../lib/persistence.js';
import {
	waitForFileLoaded,
	waitForFileUpload,
	waitForOnline,
	waitForQueryResult,
} from '../lib/waits.js';

const ctx = createTestContext({
	// serverLog: true,
	// testLog: true,
	library: 'cloning',
});

it(
	'can clone entities with files, and the files survive deletion of the original',
	{
		timeout: 10000,
	},
	async () => {
		const persistence = getPersistence();
		const clientA = await ctx.createTestClient({
			user: 'A',
			files: {
				// clean deleted files immediately
				canCleanupDeletedFile: () => true,
			},
			// logId: 'A',
			persistence,
		});
		await clientA.sync.start();
		await waitForOnline(clientA);

		const original = await clientA.items.put({
			image: createTestFile(),
			content: 'original',
		});
		const originalImage = original.get('image')!;
		await waitForFileUpload(originalImage);
		ctx.log('Uploaded file', originalImage.id);

		const clone = await clientA.items.clone(original);
		expect(clone.get('image')).not.toBeNull();
		const cloneImage = clone.get('image')!;
		await waitForFileLoaded(cloneImage);
		await waitForFileUpload(cloneImage);
		expect(cloneImage.url).not.toBeNull();
		// at this point it's blob URLs, so they will be the same as the
		// file is the same
		expect(cloneImage.url).toEqual(originalImage.url);
		clone.set('content', 'clone');

		// there should be 2 files in the database now
		let stats = await clientA.stats();
		expect(stats.files.size.count).toEqual(2);
		ctx.log('2 files in the db');

		// delete the original
		await clientA.items.delete(original.get('id'));

		// check that the clone file is still there... resetting the whole
		// client just to be sure here.
		await clientA.close();

		const clientAAgain = await ctx.createTestClient({
			user: 'A',
			files: {
				canCleanupDeletedFile: () => true,
			},
			// log: ctx.filterLog('A', 'file', 'File', 'clean'),
			persistence,
		});

		const clientAAgainClone = await clientAAgain.items.get(clone.get('id'))
			.resolved;
		expect(clientAAgainClone).not.toBeNull();
		assert(clientAAgainClone);
		expect(clientAAgainClone.get('image')).not.toBeNull();
		const clientAAgainCloneImage = clientAAgainClone.get('image')!;
		await waitForFileLoaded(clientAAgainCloneImage);
		expect(clientAAgainCloneImage.url).not.toBeNull();

		// we will also test with a remote client to make sure it
		// downloads the file to clone
		const clientB = await ctx.createTestClient({
			user: 'B',
			// logId: 'B',
		});
		await clientB.sync.start();
		const clientBCloneQuery = clientB.items.get(clientAAgainClone.get('id'));
		await waitForQueryResult(clientBCloneQuery);
		const clientBClone = clientBCloneQuery.current!;
		expect(clientBClone.get('image')).not.toBeNull();
		const clientBCloneImage = clientBClone.get('image')!;
		await waitForFileLoaded(clientBCloneImage);

		const anotherClone = await clientB.items.clone(clientBCloneQuery.current!);
		expect(anotherClone.get('image')).not.toBeNull();
		const anotherCloneImage = anotherClone.get('image')!;
		await waitForFileLoaded(anotherCloneImage);
		ctx.log(anotherCloneImage.getSnapshot());
		expect(anotherCloneImage.url).not.toBeNull();
		if (!process.env.SQLITE) {
			// because B's copy was downloaded from the server, it has
			// a size... server files are mocked to a hardcoded content
			expect(anotherCloneImage.url).toEqual('blob:text/plain:13');
		}
	},
);
