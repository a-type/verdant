// import { IDBFactory } from 'fake-indexeddb';

import {
	HybridLogicalClockTimestampProvider,
	OperationPatch,
	createCompoundIndexValue,
	getIndexValues,
} from '@verdant-web/common';
import { makeObjectRef } from '../../../common/src/refs.js';
import { storeRequestPromise } from '../idb.js';
import { openMetadataDatabase } from '../metadata/openMetadataDatabase.js';
import { createTestStorage, todoCollection } from './fixtures/testStorage.js';
import { describe, expect, it } from 'vitest';

const idb = new IDBFactory();

async function seedDatabaseAndCreateClient() {
	const client1 = await createTestStorage({ idb });
	await client1.close();
	const { db } = await openMetadataDatabase({
		indexedDB: idb,
		namespace: 'test',
	});
	const tx = db.transaction(['baselines', 'operations'], 'readwrite');
	const clock = new HybridLogicalClockTimestampProvider();
	const results = await Promise.all(
		[
			tx.objectStore('baselines').put({
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
			}),
			tx.objectStore('baselines').put({
				oid: 'todos/a.tags:foo',
				snapshot: ['tag1'],
				timestamp: clock.now(1),
			}),
			tx.objectStore('baselines').put({
				oid: 'todos/a.attachments:bar',
				snapshot: [makeObjectRef('todos/a.attachments.#:baz')],
				timestamp: clock.now(1),
			}),
			tx.objectStore('baselines').put({
				oid: 'todos/a.attachments.#:baz',
				snapshot: {
					name: 'baz',
					test: 1,
				},
				timestamp: clock.now(1),
			}),
			(() => {
				const ts = clock.now(1);
				return tx.objectStore('operations').put({
					oid: 'todos/a.tags:foo',
					timestamp: ts,
					data: {
						op: 'list-push',
						value: 'tag2',
					} as OperationPatch,
					isLocal: true,
					oid_timestamp: createCompoundIndexValue('todos/a.tags:foo', ts),
					l_t: createCompoundIndexValue(true, ts),
					d_t: createCompoundIndexValue('todos/a', ts),
				});
			})(),
		].map(storeRequestPromise),
	);
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
		expect(todo.getSnapshot()).toMatchObject({
			id: 'a',
			content: 'item a',
			tags: ['tag1', 'tag2'],
			category: 'default',
			attachments: [
				{
					name: 'baz',
					test: 1,
				},
			],
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
	});
});
