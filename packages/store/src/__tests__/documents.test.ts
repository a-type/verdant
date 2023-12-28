import { assert } from '@verdant-web/common';
import cuid from 'cuid';
import { describe, it, expect, vi, MockedFunction, vitest } from 'vitest';
import { createTestStorage } from './fixtures/testStorage.js';
import { EntityFile } from '../index.js';

async function waitForStoragePropagation(mock: MockedFunction<any>) {
	await new Promise<void>((resolve, reject) => {
		// timeout after 3s waiting
		const timeout = setTimeout(
			() => reject(new Error('Waiting for storage change timed out')),
			3000,
		);
		const interval = setInterval(() => {
			if (mock.mock.calls.length > 0) {
				clearInterval(interval);
				clearTimeout(timeout);
				resolve();
			}
		}, 0);
	});
}

describe('storage documents', () => {
	it('should fill in default values', async () => {
		const storage = await createTestStorage();

		const item = await storage.todos.put({
			content: 'item',
			category: 'general',
			attachments: [
				{
					name: 'thing',
				},
			],
		});

		expect(item.get('id')).toBeDefined();
		expect(item.get('done')).toBe(false);
		expect(item.get('tags').length).toBe(0);
		expect(item.get('attachments').get(0).get('test')).toBe(1);
	});

	it('should have a stable identity across different queries when subscribed', async () => {
		const storage = await createTestStorage({
			// log: console.log,
		});

		const item1 = await storage.todos.put({
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
			attachments: [],
		});
		await storage.todos.put({
			content: 'item 2',
			done: true,
			tags: [],
			category: 'general',
			attachments: [],
		});

		const singleItemQuery = storage.todos.get(item1.get('id'));
		const singleItemResult = await singleItemQuery.resolved;
		expect(singleItemResult).toBeTruthy();
		assert(!!singleItemResult);
		singleItemResult.subscribe('change', vi.fn());

		const allItemsQuery = storage.todos.findAll();
		const allItemsResult = await allItemsQuery.resolved;
		const allItemsReferenceToItem1 = allItemsResult.find(
			(item: any) => item.get('id') === item1.get('id'),
		);
		expect(singleItemResult).toBe(allItemsReferenceToItem1);
	});

	it('should immediately reflect mutations', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.todos.put({
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
			attachments: [],
		});

		item1.set('done', true);
		expect(item1.get('done')).toBe(true);
	});

	it('should notify about changes', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.todos.put({
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
			attachments: [],
		});

		const liveItem1 = await storage.todos.get(item1.get('id')).resolved;
		expect(liveItem1).toBeTruthy();
		assert(!!liveItem1);
		const callback = vi.fn();
		liveItem1.subscribe('change', callback);

		liveItem1.set('done', true);
		liveItem1.set('content', 'item 1 updated');

		await waitForStoragePropagation(callback);

		// only 1 callback - changes are batched.
		// expect(callback).toBeCalledTimes(1); // FIXME: called twice, once for immediate in-memory change and once after propagation. can this be 1?
		expect(liveItem1.getSnapshot()).toEqual({
			id: liveItem1.get('id'),
			content: 'item 1 updated',
			done: true,
			tags: [],
			category: 'general',
			attachments: [],
		});

		const callbackDeep = vi.fn();
		liveItem1.subscribe('changeDeep', callbackDeep);
		liveItem1.update({
			tags: ['tag 1', 'tag 2'],
		});

		await waitForStoragePropagation(callbackDeep);
		expect(liveItem1.getSnapshot().tags).toEqual(['tag 1', 'tag 2']);
	});

	it('should expose array mutators on nested arrays', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.todos.put({
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
			attachments: [],
		});

		const callback = vi.fn(() => {
			var x;
		});
		item1.get('tags').subscribe('change', callback);

		item1.get('tags').push('tag 1');
		item1.get('tags').push('tag 2');
		item1.get('tags').push('tag 3');
		item1.get('tags').move(1, 2);

		// fields are immediately updated
		expect(item1.get('tags').get(0)).toEqual('tag 1');
		expect(item1.get('tags').get(1)).toEqual('tag 3');
		expect(item1.get('tags').get(2)).toEqual('tag 2');

		await waitForStoragePropagation(callback);

		expect(callback).toBeCalledTimes(4);
		expect(item1.getSnapshot()).toEqual({
			id: item1.get('id'),
			content: 'item 1',
			done: false,
			tags: ['tag 1', 'tag 3', 'tag 2'],
			category: 'general',
			attachments: [],
		});
	});

	it('should expose array accessors on nested arrays', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.todos.put({
			content: 'item 1',
			done: false,
			tags: ['tag 1', 'tag 2'],
			category: 'general',
			attachments: [
				{
					name: 'attachment 1',
				},
			],
		});

		for (const attachment of item1.get('attachments')) {
			expect(attachment.get('name')).toBe('attachment 1');
		}

		let i = 0;
		for (const tag of item1.get('tags')) {
			expect(tag).toBe('tag ' + ++i);
		}

		expect(item1.get('tags').filter((tag: string) => tag === 'tag 1')).toEqual([
			'tag 1',
		]);

		item1.get('attachments').push({
			name: 'attachment 2',
		});

		expect(item1.get('attachments').getSnapshot()).toEqual([
			{ name: 'attachment 1', test: 1 },
			{ name: 'attachment 2', test: 1 },
		]);
	});

	it('should provide a reasonable way to interact with unknown data', async () => {
		/**
		 * 'any' field types should basically just stop type checking, but still
		 * provide full reactive entity access for nested data.
		 */

		const storage = await createTestStorage();

		const item1 = await storage.weirds.put({
			weird: {
				foo: 'bar',
				baz: [
					{
						corge: 3,
					},
				],
			},
			map: {},
			objectMap: {},
		});

		expect(item1.get('weird').get('foo')).toBe('bar');
		expect(item1.get('weird').get('baz').get(0).get('corge')).toBe(3);
		expect(item1.get('weird').getSnapshot()).toEqual({
			foo: 'bar',
			baz: [{ corge: 3 }],
		});
		item1.get('weird').get('baz').push({ corge: 4 });
		expect(item1.get('weird').get('baz').getSnapshot()).toEqual([
			{ corge: 3 },
			{ corge: 4 },
		]);
	});

	it('should provide access and updates for map-type fields', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.weirds.put({
			weird: null,
			map: {
				foo: 'bar',
				baz: 'qux',
			},
			objectMap: {
				foo: {
					content: 'bar',
				},
			},
		});

		expect(item1.get('map').get('foo')).toBe('bar');
		expect(item1.get('map').get('baz')).toBe('qux');
		expect(item1.get('map').getSnapshot()).toEqual({
			foo: 'bar',
			baz: 'qux',
		});
		expect(item1.get('objectMap').get('foo').get('content')).toBe('bar');
		expect(item1.get('objectMap').get('baz')).toBe(undefined);
		item1.get('objectMap').set('baz', { content: 'qux' });
		expect(item1.get('objectMap').get('baz').get('content')).toBe('qux');
	});

	it('should merge .update fields and not discard undefined ones', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.weirds.put({
			weird: null,
			map: {
				foo: 'bar',
				baz: 'qux',
			},
			objectMap: {
				foo: {
					content: 'bar',
				},
			},
		});

		item1.update({
			weird: 'foo',
		});

		expect(item1.get('weird')).toBe('foo');
		expect(item1.get('map').get('foo')).toBe('bar');

		item1.update({
			weird: undefined,
		});
		expect(item1.get('weird')).toBe('foo');
	});

	it('should delete undefined fields in .update if merge is false', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.weirds.put({
			weird: {
				bar: 2,
				qux: 3,
			},
			map: {
				foo: 'bar',
				baz: 'qux',
			},
			objectMap: {
				foo: {
					content: 'bar',
				},
			},
		});

		item1.get('weird').update(
			{
				bar: 1,
			},
			{
				merge: false,
			},
		);

		const weird = item1.get('weird');
		expect(weird.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "bar": 1,
			}
		`);
	});

	it('should not allow merge: false in strict schema field updates', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.todos.put({
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
			attachments: [],
		});

		expect(() => {
			item1.update({ content: 'bar' }, { merge: false });
		}).toThrowErrorMatchingInlineSnapshot(
			`[Error: Cannot use .update without merge if the field has a strict schema type. merge: false is only available on "any" or "map" types.]`,
		);
	});

	it('should apply defaults to created sub-objects in .update', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.todos.put({
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
			attachments: [],
		});

		item1.update({
			attachments: [
				{
					name: 'attachment 1',
				},
			],
		});

		expect(item1.get('attachments').get(0).get('test')).toBe(1);
	});

	it('should remove items from list when .delete is called', async () => {
		const storage = await createTestStorage();

		const item1 = await storage.todos.put({
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
			attachments: [],
		});

		item1.get('attachments').push({
			name: 'attachment 1',
		});

		item1.get('attachments').push({
			name: 'attachment 2',
		});

		item1.get('attachments').push({
			name: 'attachment 3',
		});

		item1.get('attachments').delete(1);

		expect(item1.get('attachments').length).toBe(2);
		expect(item1.get('attachments').get(0).get('name')).toBe('attachment 1');
		expect(item1.get('attachments').get(1).get('name')).toBe('attachment 3');

		// should work on lists which are not field-validated
		const item2 = await storage.weirds.put({
			weird: ['foo', 'bar', 'baz'],
		});
		item2.get('weird').delete(1);
		expect(item2.get('weird').length).toBe(2);
		expect(item2.get('weird').get(0)).toBe('foo');
		expect(item2.get('weird').get(1)).toBe('baz');
	});

	it('should expose updatedAt', async () => {
		const storage = await createTestStorage({
			// log: console.log,
		});

		let time = new Date();
		vitest.setSystemTime(time);

		const item1 = await storage.todos.put({
			content: 'item 1',
			done: false,
			tags: [],
			category: 'general',
			attachments: [],
		});

		expect(item1.updatedAt).toEqual(time.getTime());

		time = new Date(time.getTime() + 1000);
		vitest.setSystemTime(time);

		item1.update({
			content: 'item 1 updated',
		});

		expect(item1.updatedAt).toEqual(time.getTime());

		// works on nested fields
		time = new Date(time.getTime() + 1000);
		vitest.setSystemTime(time);

		item1.get('attachments').push({
			name: 'attachment 1',
		});

		expect(item1.deepUpdatedAt).toEqual(time.getTime());

		time = new Date(time.getTime() + 1000);
		vitest.setSystemTime(time);

		item1.get('attachments').get(0).set('name', 'attachment 1 updated');

		expect(item1.deepUpdatedAt).toEqual(time.getTime());

		// but other items have their own updatedAt
		expect(item1.get('tags').deepUpdatedAt).not.toEqual(time.getTime());
	});

	it('should allow creating a new document from another document snapshot', async () => {
		const storage = await createTestStorage();
		const item1 = await storage.todos.put({
			content: 'item 1',
			done: false,
			tags: ['tag 1'],
			category: 'general',
			attachments: [
				{
					name: 'attachment 1',
				},
			],
		});

		const { id, ...snapshot } = item1.getSnapshot();
		const item2 = await storage.todos.put(snapshot);

		expect(item2.get('tags').length).toBe(1);
		expect(item2.get('attachments').length).toBe(1);

		item2.get('attachments').get(0).set('name', 'attachment 2');

		expect(item1.get('attachments').get(0).get('name')).toBe('attachment 1');
	});

	it('should not allow modifying the primary key', async () => {
		const storage = await createTestStorage();
		const item1 = await storage.todos.put({
			content: 'item 1',
			done: false,
			tags: ['tag 1'],
			category: 'general',
			attachments: [
				{
					name: 'attachment 1',
				},
			],
		});

		expect(() => {
			item1.set('id', 'foo');
		}).toThrowErrorMatchingInlineSnapshot(`[Error: Cannot set readonly key id]`);
	});

	it('should properly handle pushing to a list of files', async () => {
		const storage = await createTestStorage();
		const weird = await storage.weirds.put({});

		const fileList = weird.get('fileList');
		fileList.subscribe('change', vi.fn());

		function createTestFile() {
			return new window.File(['d(⌐□_□)b'], 'test.txt', {
				type: 'text/plain',
			});
		}

		fileList.push(createTestFile());
		// fileList.get(0).subscribe('change', vi.fn());
		fileList.push(createTestFile());

		expect(fileList.get(0)).toBeInstanceOf(EntityFile);
		expect(fileList.get(1)).toBeInstanceOf(EntityFile);
	});

	it('should move files by reference in a list', async () => {
		const storage = await createTestStorage();
		const weird = await storage.weirds.put({});

		const fileList = weird.get('fileList');
		fileList.subscribe('change', vi.fn());

		function createTestFile() {
			return new window.File(['d(⌐□_□)b'], 'test.txt', {
				type: 'text/plain',
			});
		}

		const file1 = createTestFile();
		const file2 = createTestFile();
		const file3 = createTestFile();
		fileList.push(file1);
		fileList.push(file2);
		fileList.push(file3);

		const file1Ref = fileList.get(0);
		const file2Ref = fileList.get(1);
		const file3Ref = fileList.get(2);

		fileList.moveItem(file1Ref, 2);

		expect(fileList.get(0)).toBe(file2Ref);
		expect(fileList.get(1)).toBe(file3Ref);
		expect(fileList.get(2)).toBe(file1Ref);
	});
});
