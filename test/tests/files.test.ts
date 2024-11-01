import { assert } from '@a-type/utils';
import { EntityFile } from '@verdant-web/store';
import { expect, it, vi } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { createTestFile } from '../lib/createTestFile.js';
import {
	waitForCondition,
	waitForEverythingToRebase,
	waitForMockCall,
} from '../lib/waits.js';
import { getPersistence } from '../lib/persistence.js';

const context = createTestContext({
	// serverLog: true,
	testLog: true,
});

it('can store and cleanup local files', async () => {
	const { server, createTestClient } = context;
	const persistence = getPersistence();

	const onFileSaved = vi.fn();
	const clientA = await createTestClient({
		server,
		library: 'files-1',
		user: 'User A',
		// logId: 'A',
		persistence,
	});
	clientA.subscribe('fileSaved', onFileSaved);

	const a_item = await clientA.items.put({
		content: 'Apples',
	});

	a_item.set('image', createTestFile());
	const file = a_item.get('image');
	expect(file).toBeTruthy();
	assert(!!file);
	expect(file).toBeInstanceOf(EntityFile);
	// local files are cached immediately
	// when you first add them
	expect(file.loading).toBe(false);
	expect(file.url).toBeTruthy();

	// wait for file to be stored... this is
	// not ideal
	await waitForMockCall(onFileSaved);

	let stats = await clientA.stats();
	expect(stats.files.size.count).toBe(1);

	// file is persisted and can be recovered
	// after a restart
	await clientA.close();

	const clientA2 = await createTestClient({
		server,
		library: 'files-1',
		user: 'User A',
		logId: 'A2',
		persistence,
	});

	const a_item2 = await clientA2.items.get(a_item.get('id')).resolved;
	expect(a_item2).toBeTruthy();
	assert(!!a_item2);
	const file2 = a_item2.get('image');
	expect(file2).toBeTruthy();
	assert(!!file2);
	expect(file2.loading).toBe(true);
	// wait for the file to load
	await new Promise<void>((resolve) => {
		file2.subscribe('change', resolve);
	});
	expect(file2.loading).toBe(false);
	expect(file2.url).toBeTruthy();
	if (!process.env.SQLITE) {
		// this only works in browsers where the url is the same
		expect(file2.url).toBe(file.url);
	}

	// now try deleting the file
	context.log('Deleting file');
	a_item2.delete('image');
	await clientA2.entities.flushAllBatches();

	// rebase has to trigger to mark files for deletion
	await clientA2.__manualRebase();
	await waitForEverythingToRebase(clientA2);

	// need to restart the client to trigger deleted cleanup
	await clientA2.close();

	const clientA3 = await createTestClient({
		server,
		library: 'files-1',
		user: 'User A',
		files: {
			// immediately delete files
			canCleanupDeletedFile: () => true,
		},
		logId: 'A3',
		persistence,
	});

	// file should be gone - check in storage
	// TODO: reimplement this without idb specifics
	await waitForCondition(
		async () => {
			stats = await clientA3.stats();
			return stats.files.size.count === 0;
		},
		3000,
		'file deleted',
	);
});
