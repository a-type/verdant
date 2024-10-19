import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { createTestFile } from '../lib/createTestFile.js';
import { waitForEntityCondition, waitForQueryResult } from '../lib/waits.js';
import {
	createClientBackup,
	importClientBackup,
	readBackupFile,
} from '@verdant-web/store/backup';

const ctx = createTestContext({
	testLog: true,
});

it('can backup to file', async () => {
	const clientA = await ctx.createTestClient({
		library: 'backup',
		user: 'A',
	});
	const clientB = await ctx.createTestClient({
		library: 'backup',
		user: 'B',
	});

	ctx.log('Seeding data');
	clientA.sync.start();
	clientB.sync.start();
	const a_apples = await clientA.items.put({ id: 'apples', content: 'Apples' });
	const a_oranges = await clientA.items.put({
		id: 'oranges',
		content: 'Oranges',
	});
	await clientA.items.put({
		id: 'bananas',
		content: 'Bananas',
		image: createTestFile('banana image'),
	});
	await clientA.items.put({
		id: 'grapes',
		content: 'Grapes',
		image: createTestFile('grape image'),
	});

	a_apples.set('comments', [{ authorId: '1', content: 'Good' }]);
	a_oranges.set('purchased', true);

	// wait for B to sync everything
	await waitForQueryResult(clientB.items.findAll(), (r) => r.length === 4);
	const bOranges = clientB.items.get('oranges');
	await waitForQueryResult(bOranges);
	await waitForEntityCondition(bOranges.current!, (o) => !!o?.get('purchased'));
	const bBananas = clientB.items.get('bananas');
	await waitForQueryResult(bBananas);
	await waitForEntityCondition(bBananas.current!, (b) => !!b?.get('image'));

	ctx.log('Backing up from B');
	const backupFile = await createClientBackup(clientB as any);

	expect(backupFile).toBeDefined();

	// let's check the contents
	const backupContents = await readBackupFile(backupFile);
	expect(backupContents).toBeDefined();
	// hard to really assert what these are because rebasing
	// happens periodically
	expect(backupContents.data.baselines).toBeDefined();
	expect(backupContents.data.operations).toBeDefined();
	// but files we should know
	expect(backupContents.fileData.length).toBe(2);
	expect(backupContents.files.length).toBe(2);
	for (const fileData of backupContents.fileData) {
		// there should be a corresponding file
		expect(
			backupContents.files.find((f) => f.name.split('___')[0] === fileData.id),
		).toBeDefined();
	}

	// import into a new client
	const clientC = await ctx.createTestClient({
		library: 'backup',
		user: 'C',
		logId: 'C',
	});

	await importClientBackup(clientC as any, backupFile);
	ctx.log('backup imported');

	// check the data
	await waitForQueryResult(
		clientC.items.findAll(),
		(r) => r.length === 4,
		1000,
		'backed up items',
	);
	ctx.log('items synced');
	const cOranges = clientC.items.get('oranges');
	await waitForQueryResult(cOranges, (r) => !!r, 1000, 'oranges');
	await waitForEntityCondition(cOranges.current!, (o) => !!o?.get('purchased'));
	const cBananas = clientC.items.get('bananas');
	await waitForQueryResult(cBananas, (r) => !!r, 1000, 'bananas');
	await waitForEntityCondition(
		cBananas.current!,
		(b) => !!b?.get('image'),
		1000,
		'image',
	);
});
