import {
	HybridLogicalClockTimestampProvider,
	OperationPatch,
	getIndexValues,
	makeObjectRef,
} from '@verdant-web/common';
import { storeRequestPromise } from '../idb.js';
import { openMetadataDatabase } from '../metadata/openMetadataDatabase.js';
import { createTestStorage, todoCollection } from './fixtures/testStorage.js';
import { describe, expect, it } from 'vitest';
import { OperationsStore } from '../metadata/OperationsStore.js';
import { BaselinesStore } from '../metadata/BaselinesStore.js';

const idb = new IDBFactory();

async function seedDatabaseAndCreateClient() {
	const client1 = await createTestStorage({ idb, metadataVersion: 4 });
	await client1.close();
	const { db } = await openMetadataDatabase({
		indexedDB: idb,
		namespace: 'test',
		metadataVersion: 4,
	});
	expect(db.version).toBe(4);
	const tx = db.transaction(['baselines', 'operations'], 'readwrite');
	const clock = new HybridLogicalClockTimestampProvider();
	const ops = new OperationsStore(db);
	const baselines = new BaselinesStore(db);
	await Promise.all([
		baselines.setAll(
			[
				{
					oid: 'weirds/b.objectMap.one:ghi',
					snapshot: { content: 'ghi' },
					timestamp: clock.now(1),
				},
				{
					oid: 'weirds/b.objectMap.two:jkl',
					snapshot: { content: 'jkl' },
					timestamp: clock.now(1),
				},
				{
					oid: 'weirds/b.map:abc',
					snapshot: {},
					timestamp: clock.now(1),
				},
				{
					oid: 'weirds/b.objectMap:def',
					snapshot: {
						one: makeObjectRef('weirds/b.objectMap.one:ghi'),
						two: makeObjectRef('weirds/b.objectMap.two:jkl'),
					},
					timestamp: clock.now(1),
				},
				{
					oid: 'weirds/b.weird.ok:opq',
					snapshot: {
						message: 'ok',
					},
					timestamp: clock.now(1),
				},
				{
					oid: 'weirds/b.weird.cool:rst',
					snapshot: {
						message: 'cool',
					},
					timestamp: clock.now(1),
				},
				{
					oid: 'weirds/b.weird.list.#:xyz',
					snapshot: {
						name: 'xyz',
						test: 1,
					},
					timestamp: clock.now(1),
				},
				{
					oid: 'weirds/b.weird.list.#:123',
					snapshot: {
						name: '123',
						test: 2,
					},
					timestamp: clock.now(1),
				},
				{
					oid: 'weirds/b.weird.list:uvw',
					snapshot: [
						makeObjectRef('weirds/b/weird.list.#:xyz'),
						makeObjectRef('weirds/b/weird.list.#:123'),
					],
					timestamp: clock.now(1),
				},
				{
					oid: 'weirds/b.weird:lmn',
					snapshot: {
						ok: makeObjectRef('weirds/b.weird.ok:opq'),
						cool: makeObjectRef('weirds/b.weird.cool:rst'),
						list: makeObjectRef('weirds/b.weird.list:uvw'),
					},
					timestamp: clock.now(1),
				},
				{
					oid: 'weirds/b',
					snapshot: {
						id: 'b',
						map: makeObjectRef('weirds/b.map:abc'),
						objectMap: makeObjectRef('weirds/b.objectMap:def'),
						weird: makeObjectRef('weirds/b.weird:lmn'),
					},
					timestamp: clock.now(1),
				},
				{
					oid: 'todos/a.attachments.#:baz',
					snapshot: {
						name: 'baz',
						test: 1,
					},
					timestamp: clock.now(1),
				},
				{
					oid: 'todos/a.attachments.#:qux',
					snapshot: {
						name: 'qux',
						test: 2,
					},
					timestamp: clock.now(1),
				},
				{
					oid: 'todos/a.attachments:bar',
					snapshot: [
						makeObjectRef('todos/a.attachments.#:baz'),
						makeObjectRef('todos/a.attachments.#:qux'),
					],
					timestamp: clock.now(1),
				},
				{
					oid: 'todos/a.tags:foo',
					snapshot: ['tag1'],
					timestamp: clock.now(1),
				},
				{
					oid: 'todos/a',
					snapshot: {
						id: 'a',
						content: 'item a',
						tags: makeObjectRef('todos/a.tags:foo'),
						done: false,
						category: 'default',
						attachments: makeObjectRef('todos/a.attachments:bar'),
					},
					timestamp: clock.now(1),
				},
			],
			{ transaction: tx },
		),
		ops.addOperations(
			[
				// trying to cover all types of operations which use refs here
				{
					oid: 'todos/a.tags:foo',
					timestamp: clock.now(1),
					data: {
						op: 'list-push',
						value: 'tag2',
					} as OperationPatch,
					isLocal: true,
				},
				{
					oid: 'todos/a.attachments.#:bin',
					timestamp: clock.now(1),
					data: {
						op: 'initialize',
						value: {
							name: 'bin',
							test: 2,
						},
					},
					isLocal: true,
				},
				{
					oid: 'todos/a.attachments:bar',
					timestamp: clock.now(1),
					data: {
						op: 'list-push',
						value: makeObjectRef('todos/a.attachments.#:bin'),
					},
					isLocal: true,
				},
				{
					oid: 'todos/a.attachments:bar',
					timestamp: clock.now(1),
					isLocal: true,
					data: {
						op: 'list-remove',
						value: makeObjectRef('todos/a.attachments.#:baz'),
					},
				},
				{
					oid: 'weirds/b.objectMap:def',
					timestamp: clock.now(1),
					data: {
						op: 'delete',
					},
					isLocal: true,
				},
				{
					oid: 'weirds/b.weird.list:uvw',
					timestamp: clock.now(1),
					data: {
						op: 'delete',
					},
					isLocal: true,
				},
			],
			{ transaction: tx },
		),
	]);
	db.close();
	// documents are a little trickier.
	const docDbReq = idb.open('test_collections', 1);
	const docDb = await new Promise<IDBDatabase>((resolve, reject) => {
		docDbReq.addEventListener('success', () => resolve(docDbReq.result));
		docDbReq.addEventListener('error', reject);
	});
	const docTx = docDb.transaction(['todos'], 'readwrite');
	await Promise.all(
		[
			docTx.objectStore('todos').put(
				getIndexValues(todoCollection, {
					id: 'a',
					content: 'item a',
					tags: ['tag1', 'tag2'],
					done: false,
					category: 'default',
					attachments: [
						{
							name: 'baz',
							test: 1,
						},
					],
				}),
			),
		].map(storeRequestPromise),
	);
	docDb.close();
	await new Promise((resolve) => setTimeout(resolve, 100));
	return createTestStorage({ idb });
}

describe('clients with stored legacy oids', () => {
	it('can still function', async () => {
		const client = await seedDatabaseAndCreateClient();
		const todo = await client.todos.get('a').resolved;
		const weird = await client.weirds.get('b').resolved;

		// first: does the data look right?
		expect(todo.getSnapshot()).toMatchObject({
			id: 'a',
			content: 'item a',
			tags: ['tag1', 'tag2'],
			done: false,
			category: 'default',
			attachments: [
				{
					name: 'qux',
					test: 2,
				},
				{
					name: 'bin',
					test: 2,
				},
			],
		});
		expect(weird.getSnapshot()).toMatchObject({
			id: 'b',
			map: {},
			objectMap: null,
			weird: {
				list: null,
				cool: {
					message: 'cool',
				},
				ok: {
					message: 'ok',
				},
			},
		});

		todo.get('attachments').push({
			name: 'qux',
		});
		await client.todos.put({
			id: 'aa',
			content: 'item aa',
			tags: [],
			category: 'default',
			attachments: [],
		});
		await client.todos.delete('a');
		const allTodos = await client.todos.findAll().resolved;
		expect(allTodos.map((t) => t.getSnapshot())).toMatchInlineSnapshot(`
			[
			  {
			    "attachments": [],
			    "category": "default",
			    "content": "item aa",
			    "done": false,
			    "id": "aa",
			    "tags": [],
			  },
			]
		`);

		weird.get('weird').set('another', 'bar');
		weird.get('weird').set('list', ['a', 'b', 'c']);
		weird.get('weird').delete('cool');
		weird.get('map').set('foo', 'bar');
		expect(weird.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "id": "b",
			  "map": {
			    "foo": "bar",
			  },
			  "objectMap": null,
			  "weird": {
			    "another": "bar",
			    "list": [
			      "a",
			      "b",
			      "c",
			    ],
			    "ok": {
			      "message": "ok",
			    },
			  },
			}
		`);
	});
});
