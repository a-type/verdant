import { it, expect } from 'vitest';
import { createTestClient } from './lib/testClient.js';
import { waitForQueryResult } from './lib/waits.js';

it('cleans up metadata after deletion but can still restore the document', async () => {
	const client = await createTestClient({
		library: 'test',
		user: 'test',
	});

	await client.items.put({
		id: '1',
		content: 'test',
	});
	await client.items.put({
		id: '2',
		content: 'again',
	});

	await waitForQueryResult(client.items.findAll());

	await client.items.deleteAll(['1', '2']);

	await waitForQueryResult(client.items.findAll(), (val) => !val?.length);

	const stats = await client.stats();
	expect(stats.collections.items.count).toBe(0);
	expect(stats.meta.operationsSize).toEqual({
		count: 0,
		size: 0,
	});
	expect(stats.meta.baselinesSize).toEqual({
		count: 0,
		size: 0,
	});

	await client.undoHistory.undo();

	await waitForQueryResult(client.items.findAll());

	const one = await client.items.get('1').resolved;
	const two = await client.items.get('2').resolved;

	expect(one.get('content')).toBe('test');
	expect(two.get('content')).toBe('again');

	one.set('content', 'changed');
	expect(one.get('content')).toBe('changed');
});
