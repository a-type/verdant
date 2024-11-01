import { it, expect } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { createTestFile } from '../lib/createTestFile.js';
import {
	waitForFileLoaded,
	waitForFileUpload,
	waitForQueryResult,
} from '../lib/waits.js';
import { assert } from '@verdant-web/common';
import { getPersistence } from '../lib/persistence.js';

const ctx = createTestContext({
	serverLog: true,
	testLog: true,
});

it(
	'can clone entities with files, and the files survive deletion of the original',
	{
		timeout: 10000,
	},
	async () => {
		const persistence = getPersistence();
		const clientA = await ctx.createTestClient({
			library: 'cloning',
			user: 'A',
			files: {
				// clean deleted files immediately
				canCleanupDeletedFile: () => true,
			},
			logId: 'A',
			persistence,
		});
		await clientA.sync.start();

		const original = await clientA.items.put({
			image: createTestFile(),
			content: 'original',
		});
		const originalImage = original.get('image')!;
		// NOT REACHING THIS?
		console.log('waiting for file upload');
		await waitForFileUpload(originalImage);
		console.log('Uploaded file', originalImage.url);
		const originalImageUrl = originalImage.url;

		const clone = await clientA.items.clone(original);
		expect(clone.get('image')).not.toBeNull();
		const cloneImage = clone.get('image')!;
		await waitForFileLoaded(cloneImage);
		expect(cloneImage.url).not.toBeNull();
		// at this point it's blob URLs, so they will be the same as the
		// file is the same
		expect(cloneImage.url).toEqual(originalImage.url);
		clone.set('content', 'clone');

		// there should be 2 files in the database now
		let stats = await clientA.stats();
		expect(stats.files.size.count).toEqual(2);

		// delete the original
		await clientA.items.delete(original.get('id'));

		// check that the clone file is still there... resetting the whole
		// client just to be sure here.
		await clientA.close();

		const clientAAgain = await ctx.createTestClient({
			library: 'cloning',
			user: 'A',
			files: {
				canCleanupDeletedFile: () => true,
			},
			log: ctx.filterLog('A', 'file', 'File', 'clean'),
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
		// note for future me... this might not be an important
		// thing to assert since the URL is so dependent on test
		// env stuff.
		expect(clientAAgainCloneImage.url).toEqual(originalImageUrl);

		// we will also test with a remote client to make sure it
		// downloads the file to clone
		const clientB = await ctx.createTestClient({
			library: 'cloning',
			user: 'B',
		});
		await clientB.sync.start();
		const clientBCloneQuery = clientB.items.get(clientAAgainClone.get('id'));
		await waitForQueryResult(clientBCloneQuery);
		const anotherClone = await clientB.items.clone(clientBCloneQuery.current!);
		expect(anotherClone.get('image')).not.toBeNull();
		const clientBCloneImage = anotherClone.get('image')!;
		expect(clientBCloneImage.url).not.toBeNull();
		// because B's copy was downloaded from the server, it has
		// a size... server files are mocked to a hardcoded content
		expect(clientBCloneImage.url).toEqual('blob:text/plain:13');
	},
);
