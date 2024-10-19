import { assert } from '@a-type/utils';
import { EntityFile } from '@verdant-web/store';
import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { createTestFile } from '../lib/createTestFile.js';
import { waitForEverythingToRebase } from '../lib/waits.js';

const context = createTestContext({
	serverLog: true,
	testLog: true,
});

it('can store and cleanup local files', async () => {
	const { server, createTestClient } = context;
	const indexedDb = new IDBFactory();

	const clientA = await createTestClient({
		server,
		library: 'files-1',
		user: 'User A',
		indexedDb,
		logId: 'A',
	});

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
	await new Promise<void>((resolve) => setTimeout(resolve, 100));

	// file is persisted and can be recovered
	// after a restart
	await clientA.close();

	const clientA2 = await createTestClient({
		server,
		library: 'files-1',
		user: 'User A',
		indexedDb,
		logId: 'A2',
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
	expect(file2.url).toBe(file.url);

	// now try deleting the file
	a_item2.delete('image');

	// rebase has to trigger to mark files for deletion
	await waitForEverythingToRebase(clientA2);

	// need to restart the client to trigger deleted cleanup
	await clientA2.close();

	const clientA3 = await createTestClient({
		server,
		library: 'files-1',
		user: 'User A',
		indexedDb,
		files: {
			// immediately delete files
			canCleanupDeletedFile: () => true,
		},
		logId: 'A3',
	});

	// wait for microtasks to run
	await new Promise((resolve) => setTimeout(resolve, 0));

	// file should be gone - check in indexeddb
	// NOTE: this is brittle, relies on implementation details
	const db = await new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDb.open('files-1_User A_meta');
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
		request.onupgradeneeded = (ev) => {
			reject(
				new Error(
					`Test database usage needs the right meta db version (${ev.oldVersion})})`,
				),
			);
		};
	});

	const tx = db.transaction('files', 'readonly');
	const store = tx.objectStore('files');
	const request = store.get(file.id);

	await new Promise<void>((resolve, reject) => {
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});

	expect(request.result).toBeUndefined();
});
