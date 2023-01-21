import { assert } from '@a-type/utils';
import { EntityFile } from '@lo-fi/web';
import { expect, it } from 'vitest';
import { createTestContext } from './lib/createTestContext.js';
import { createTestFile } from './lib/createTestFile.js';

const context = createTestContext();

it('can store local files', async () => {
	const { server, createTestClient } = context;
	const indexedDb = new IDBFactory();

	const clientA = await createTestClient({
		server,
		library: 'files-1',
		user: 'User A',
		indexedDb,
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

	// file is persisted and can be recovered
	// after a restart
	await clientA.close();

	const clientA2 = await createTestClient({
		server,
		library: 'files-1',
		user: 'User A',
		indexedDb,
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
});
