import { assert } from '@verdant-web/common';
import { expect, it } from 'vitest';
import { createTestClient } from '../lib/testClient.js';
import { waitForQueryResult } from '../lib/waits.js';

it('cleans up metadata after deletion but can still restore the document', async () => {
	const client = await createTestClient({
		library: 'deletion-1',
		user: 'test',
		// logId: 'A',
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

	await client.__manualRebase();

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
	assert(one);
	assert(two);

	expect(one.get('content')).toBe('test');
	expect(two.get('content')).toBe('again');

	one.set('content', 'changed');
	expect(one.get('content')).toBe('changed');
});

it("correctly deleteSelf's various sub-objects", async () => {
	const client = await createTestClient({
		library: 'deletion-2',
		user: 'test',
		// logId: 'B',
	});

	const item = await client.items.put({
		id: '1',
		content: 'test',
	});

	const comments = item.get('comments');

	comments.push({
		id: '1',
		content: 'first',
		authorId: 'foo',
	});
	comments.push({
		id: '2',
		content: 'second',
		authorId: 'foo',
	});
	comments.push({
		id: '3',
		content: 'third',
		authorId: 'foo',
	});

	expect(comments.getSnapshot()).toEqual([
		{
			id: '1',
			content: 'first',
			authorId: 'foo',
		},
		{
			id: '2',
			content: 'second',
			authorId: 'foo',
		},
		{
			id: '3',
			content: 'third',
			authorId: 'foo',
		},
	]);

	comments.get(1).deleteSelf();

	expect(comments.getSnapshot()).toEqual([
		{
			id: '1',
			content: 'first',
			authorId: 'foo',
		},
		{
			id: '3',
			content: 'third',
			authorId: 'foo',
		},
	]);

	comments.get(0).deleteSelf();

	expect(comments.getSnapshot()).toEqual([
		{
			id: '3',
			content: 'third',
			authorId: 'foo',
		},
	]);

	expect(comments.getSnapshot()).toEqual([
		{
			id: '3',
			content: 'third',
			authorId: 'foo',
		},
	]);

	const category = await client.categories.put({
		id: 'cat1',
		name: 'cat1',
		metadata: {
			color: 'red',
		},
	});

	category.get('metadata')?.deleteSelf();

	expect(category.getSnapshot()).toEqual({
		id: 'cat1',
		name: 'cat1',
		metadata: null,
	});
});
