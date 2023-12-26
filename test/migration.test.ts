import { it, expect, describe } from 'vitest';
import {
	schema,
	collection,
	StorageDescriptor,
	Migration,
	ClientWithCollections,
	createMigration,
} from '@verdant-web/store';
import { ReplicaType } from '@verdant-web/server';
// @ts-ignore
import { IDBFactory } from 'fake-indexeddb';
import { startTestServer } from './lib/testServer.js';
import { waitForQueryResult } from './lib/waits.js';

async function createTestClient({
	schema,
	migrations,
	server,
	library,
	user,
	type = ReplicaType.Realtime,
	logId,
	disableRebasing,
	indexedDb = new IDBFactory(),
}: {
	schema: any;
	migrations: Migration<any>[];
	server?: { port: number };
	library: string;
	user: string;
	type?: ReplicaType;
	logId?: string;
	disableRebasing?: boolean;
	indexedDb?: IDBFactory;
}): Promise<ClientWithCollections> {
	const desc = new StorageDescriptor({
		schema,
		migrations,
		namespace: `${library}_${user}`,
		sync: server
			? {
					authEndpoint: `http://localhost:${server.port}/auth/${library}?user=${user}&type=${type}`,
					initialPresence: {},
					defaultProfile: {},
					initialTransport: 'realtime',
			  }
			: undefined,
		log: logId
			? (...args: any[]) => console.log(`[${logId}]`, ...args)
			: undefined,
		indexedDb,
		disableRebasing,
	});
	const client = await desc.open();
	return client as ClientWithCollections;
}

function log(...args: any[]) {
	console.log(...args);
}

// Using the ungenerated client to be more dynamic with the schema
// This means a lot of ts-ignore because the inner typings are
// way too complicated for external use (hence codegen)
it(
	'offline migrates to add collections, indexes, and defaults; or changing data shape',
	async () => {
		const indexedDb = new IDBFactory();
		const v1Item = collection({
			name: 'item',
			primaryKey: 'id',
			fields: {
				id: { type: 'string' },
				contents: { type: 'string', nullable: true },
				tags: { type: 'array', items: { type: 'string' } },
			},
		});
		const v1Schema = schema({
			version: 1,
			collections: {
				items: v1Item,
			},
		});

		let migrations: Migration<any>[] = [createMigration(v1Schema)];

		const clientInit = {
			migrations,
			library: 'test',
			user: 'a',
			indexedDb,
		};

		// @ts-ignore
		let client = await createTestClient({
			schema: v1Schema,
			...clientInit,
			logId: 'client1',
		});

		log('📈 Version 1 client created');

		await client.items.put({
			id: '1',
			contents: 'hello',
		});
		await client.items.put({
			id: '2',
			contents: 'world',
			tags: ['a', 'b', 'c'],
		});
		await client.items.put({
			id: '3',
			tags: ['a', 'b'],
		});

		await client.close();
		await new Promise<void>((resolve) => resolve());

		const v2Item = collection({
			name: 'item',
			primaryKey: 'id',
			fields: {
				id: { type: 'string', default: () => 'default' },
				contents: { type: 'string', default: 'empty' },
				tags: { type: 'array', items: { type: 'string' } },
				listId: { type: 'string', nullable: true, indexed: true },
			},
			synthetics: {
				hasTags: {
					type: 'string',
					compute: (item) => (item.tags.length > 0 ? 'true' : 'false'),
				},
			},
			compounds: {
				contents_tag: {
					of: ['contents', 'tags'],
				},
			},
		});
		const v2List = collection({
			name: 'list',
			primaryKey: 'id',
			fields: {
				id: { type: 'string', default: 'something' },
				name: { type: 'string' },
				items: { type: 'array', items: { type: 'string' } },
				nullable: { type: 'string', nullable: true },
			},
		});

		const v2Schema = schema({
			version: 2,
			collections: {
				items: v2Item,
				lists: v2List,
			},
		});

		// specifically testing empty migration here - will the new defaults
		// be added?
		migrations.push(createMigration(v1Schema, v2Schema, async () => {}));

		client = await createTestClient({
			schema: v2Schema,
			...clientInit,
		});

		log('📈 Version 2 client created');

		// check our test items
		let item1 = await client.items.get('1').resolved;
		expect(item1.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "contents": "hello",
			  "id": "1",
			  "listId": null,
			  "tags": [],
			}
		`);
		let item2 = await client.items.get('2').resolved;
		expect(item2.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "contents": "world",
			  "id": "2",
			  "listId": null,
			  "tags": [
			    "a",
			    "b",
			    "c",
			  ],
			}
		`);
		let item3 = await client.items.get('3').resolved;
		expect(item3.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "contents": "empty",
			  "id": "3",
			  "listId": null,
			  "tags": [
			    "a",
			    "b",
			  ],
			}
		`);

		// check our new indexes
		const emptyResults = await client.items.findAll({
			index: {
				where: 'hasTags',
				equals: 'false',
			},
		}).resolved;
		expect(emptyResults.length).toBe(1);

		const compoundResults = await client.items.findAll({
			index: {
				where: 'contents_tag',
				match: {
					contents: 'empty',
					tags: 'a',
				},
			},
		}).resolved;
		expect(compoundResults.length).toBe(1);

		// create some more test data
		let list1 = await client.lists.put({
			id: 'list1',
			name: 'list 1',
		});

		item3.set('listId', list1.get('id'));
		expect(item3.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "contents": "empty",
			  "id": "3",
			  "listId": "list1",
			  "tags": [
			    "a",
			    "b",
			  ],
			}
		`);

		await client.close();

		// the final schema change includes refactoring the tags
		// array to use objects instead of strings
		const v3Item = collection({
			name: 'item',
			primaryKey: 'id',
			fields: {
				id: { type: 'string', default: () => 'default' },
				contents: { type: 'string', default: 'empty' },
				tags: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							name: {
								type: 'string',
							},
							color: {
								type: 'string',
							},
						},
					},
				},
				listId: { type: 'string', nullable: true, indexed: true },
			},
			synthetics: {
				hasTags: {
					type: 'string',
					compute: (item) => (item.tags.length > 0 ? 'true' : 'false'),
				},
			},
			// the compound index is no longer possible...
			// TODO: synthetic index that returns an array, using that to map
			// tags to their values, then using that to create a compound index?
		});
		const v3List = collection({
			name: 'list',
			primaryKey: 'id',
			fields: {
				id: { type: 'string', default: 'something' },
				name: { type: 'string' },
				items: { type: 'array', items: { type: 'string' } },
				nullable: { type: 'string', default: 'not nullable anymore' },
			},
		});

		const v3Schema = schema({
			version: 3,
			collections: {
				items: v3Item,
				lists: v3List,
			},
		});

		migrations.push(
			createMigration(v2Schema, v3Schema, async ({ migrate }) => {
				await migrate('items', ({ tags, ...rest }) => {
					return {
						...rest,
						tags: tags.map((tag: any) => ({
							name: tag,
							color: 'red',
						})),
					};
				});
			}),
		);

		client = await createTestClient({
			schema: v3Schema,
			...clientInit,
		});

		log('📈 Version 3 client created');

		// check our test items
		item1 = await client.items.get('1').resolved;
		expect(item1.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "contents": "hello",
			  "id": "1",
			  "listId": null,
			  "tags": [],
			}
		`);
		item2 = await client.items.get('2').resolved;
		expect(item2.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "contents": "world",
			  "id": "2",
			  "listId": null,
			  "tags": [
			    {
			      "color": "red",
			      "name": "a",
			    },
			    {
			      "color": "red",
			      "name": "b",
			    },
			    {
			      "color": "red",
			      "name": "c",
			    },
			  ],
			}
		`);
		item3 = await client.items.get('3').resolved;
		expect(item3.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "contents": "empty",
			  "id": "3",
			  "listId": "list1",
			  "tags": [
			    {
			      "color": "red",
			      "name": "a",
			    },
			    {
			      "color": "red",
			      "name": "b",
			    },
			  ],
			}
		`);

		list1 = await client.lists.get('list1').resolved;
		expect(list1.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "id": "list1",
			  "items": [],
			  "name": "list 1",
			  "nullable": "not nullable anymore",
			}
		`);

		await client.close();

		const v4List = collection({
			name: 'list',
			primaryKey: 'id',
			fields: {
				id: { type: 'string', default: () => 'default' },
				name: { type: 'string', default: 'empty' },
				items: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							...v3Item.fields,
						},
					},
				},
			},
		});

		const v4Schema = schema({
			version: 4,
			collections: {
				lists: v4List,
			},
		});

		migrations.push(
			createMigration(
				v3Schema,
				v4Schema,
				async ({ migrate, queries, mutations }) => {
					await migrate('lists', async (old) => {
						const items = await queries.items.findAll({
							where: 'listId',
							equals: old.id,
						});
						return {
							...old,
							items,
						};
					});

					// we have to create a list for non-assigned items and assign them
					// so they're not lost!
					// FIXME: allow querying directly for listId=null
					const unassignedItems = (await queries.items.findAll()).filter(
						(item) => !item.listId,
					);
					await mutations.lists.put({
						id: 'uncategorized',
						name: 'Uncategorized',
						items: unassignedItems,
					});
				},
			),
		);

		client = await createTestClient({
			schema: v4Schema,
			// disable rebasing so we get predictable metadata
			disableRebasing: true,
			...clientInit,
		});

		log('📈 Version 4 client created');

		// check our test items
		let defaultList = await client.lists.get('uncategorized').resolved;
		expect(defaultList.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "id": "uncategorized",
			  "items": [
			    {
			      "contents": "hello",
			      "id": "1",
			      "listId": null,
			      "tags": [],
			    },
			    {
			      "contents": "world",
			      "id": "2",
			      "listId": null,
			      "tags": [
			        {
			          "color": "red",
			          "name": "a",
			        },
			        {
			          "color": "red",
			          "name": "b",
			        },
			        {
			          "color": "red",
			          "name": "c",
			        },
			      ],
			    },
			  ],
			  "name": "Uncategorized",
			}
		`);
		list1 = await client.lists.get('list1').resolved;
		expect(list1.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "id": "list1",
			  "items": [
			    {
			      "contents": "empty",
			      "id": "3",
			      "listId": "list1",
			      "tags": [
			        {
			          "color": "red",
			          "name": "a",
			        },
			        {
			          "color": "red",
			          "name": "b",
			        },
			      ],
			    },
			  ],
			  "name": "list 1",
			}
		`);

		// breaking the surface API a bit, I also want to check to see
		// that we created delete operations for every existing item
		// when dropping the table.
		const localItemDeletes: any[] = [];
		await client.meta.operations.iterateOverAllLocalOperations((op) => {
			if (op.oid.startsWith('items') && op.data.op === 'delete') {
				localItemDeletes.push(op);
			}
		}, {});
		// 13 is the number of total nested objects in our 3 items
		expect(localItemDeletes).toHaveLength(11);

		await client.close();

		const v5List = collection({
			name: 'list',
			primaryKey: 'id',
			fields: {
				id: { type: 'string', default: () => 'default' },
				name: { type: 'string', default: 'empty' },
				items: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							...v3Item.fields,
						},
					},
				},
			},
			synthetics: {
				hasItems: {
					type: 'boolean',
					compute: (list) => list.items.length > 0,
				},
				itemTags: {
					type: 'string[]',
					compute: (list) =>
						list.items.flatMap((item) => item.tags.map((tag) => tag.name)),
				},
			},
		});

		const v5Schema = schema({
			version: 5,
			collections: {
				lists: v5List,
			},
		});

		migrations.push(createMigration(v4Schema, v5Schema));

		client = await createTestClient({
			schema: v5Schema,
			...clientInit,
		});

		defaultList = await client.lists.get('uncategorized').resolved;
		expect(defaultList.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "id": "uncategorized",
			  "items": [
			    {
			      "contents": "hello",
			      "id": "1",
			      "listId": null,
			      "tags": [],
			    },
			    {
			      "contents": "world",
			      "id": "2",
			      "listId": null,
			      "tags": [
			        {
			          "color": "red",
			          "name": "a",
			        },
			        {
			          "color": "red",
			          "name": "b",
			        },
			        {
			          "color": "red",
			          "name": "c",
			        },
			      ],
			    },
			  ],
			  "name": "Uncategorized",
			}
		`);
		list1 = await client.lists.get('list1').resolved;
		expect(list1.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "id": "list1",
			  "items": [
			    {
			      "contents": "empty",
			      "id": "3",
			      "listId": "list1",
			      "tags": [
			        {
			          "color": "red",
			          "name": "a",
			        },
			        {
			          "color": "red",
			          "name": "b",
			        },
			      ],
			    },
			  ],
			  "name": "list 1",
			}
		`);
	},
	15 * 1000,
);

it('migrates in an online world where old operations still come in', async () => {
	const server = await startTestServer({});
	const indexedDbA = new IDBFactory();
	const indexedDBB = new IDBFactory();
	const v1Item = collection({
		name: 'item',
		primaryKey: 'id',
		fields: {
			id: { type: 'string' },
			contents: { type: 'string', nullable: true },
			tags: { type: 'array', items: { type: 'string' } },
		},
	});
	const v1Schema = schema({
		version: 1,
		collections: {
			items: v1Item,
		},
	});

	let migrations: Migration<any>[] = [createMigration(v1Schema)];

	const clientInit = {
		migrations,
		library: 'test',
		user: 'a',
		server,
	};

	// @ts-ignore
	let clientA = await createTestClient({
		schema: v1Schema,
		...clientInit,
		indexedDb: indexedDbA,
		// logId: 'client1',
	});
	clientA.sync.start();

	log('📈 Version 1 client A created');

	await clientA.items.put({
		id: '1',
		contents: 'hello',
	});
	await clientA.items.put({
		id: '2',
		contents: 'world',
		tags: ['a', 'b', 'c'],
	});
	await clientA.items.put({
		id: '3',
		tags: ['a', 'b'],
	});

	await clientA.close();
	await new Promise<void>((resolve) => resolve());

	let clientB = await createTestClient({
		schema: v1Schema,
		...clientInit,
		indexedDb: indexedDBB,
		// logId: 'client2',
	});
	clientB.sync.start();

	log('📈 Version 1 client B created');

	let b4 = await clientB.items.put({
		id: '4',
	});
	let b5 = await clientB.items.put({
		id: '5',
		contents: 'world',
		tags: ['a', 'b', 'c'],
	});
	b5.set('contents', 'so long');
	b5.get('tags').push('d');

	await waitForQueryResult(clientB.items.get('1'));
	const b1 = await clientB.items.get('1').resolved;
	b1.set('contents', 'hi from b');

	await clientB.entities.flushAllBatches();

	await clientB.close();
	await new Promise<void>((resolve) => resolve());

	const v2Item = collection({
		name: 'item',
		primaryKey: 'id',
		fields: {
			id: { type: 'string', default: () => 'default' },
			contents: { type: 'string', default: 'empty' },
			tags: { type: 'array', items: { type: 'string' } },
			listId: { type: 'string', nullable: true, indexed: true },
			newField: { type: 'string', default: 'should be here!' },
		},
		synthetics: {
			hasTags: {
				type: 'string',
				compute: (item) => (item.tags.length > 0 ? 'true' : 'false'),
			},
		},
		compounds: {
			contents_tag: {
				of: ['contents', 'tags'],
			},
		},
	});

	const v2Schema = schema({
		version: 2,
		collections: {
			items: v2Item,
		},
	});

	migrations.push(
		createMigration(v1Schema, v2Schema, async ({ migrate }) => {}),
	);

	clientA = await createTestClient({
		schema: v2Schema,
		...clientInit,
		indexedDb: indexedDbA,
		// logId: 'client1',
	});
	clientA.sync.start();

	log('📈 Version 2 client A created');

	// wait for sync to all come in
	await waitForQueryResult(
		clientA.items.get('1'),
		(item) => item.get('contents') === 'hi from b',
	);

	// check our test items
	let item1 = await clientA.items.get('1').resolved;
	expect(item1.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "contents": "hi from b",
			  "id": "1",
			  "listId": null,
			  "newField": "should be here!",
			  "tags": [],
			}
		`);
	let item2 = await clientA.items.get('2').resolved;
	expect(item2.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "contents": "world",
			  "id": "2",
			  "listId": null,
			  "newField": "should be here!",
			  "tags": [
			    "a",
			    "b",
			    "c",
			  ],
			}
		`);
	let item3 = await clientA.items.get('3').resolved;
	expect(item3.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "contents": "empty",
			  "id": "3",
			  "listId": null,
			  "newField": "should be here!",
			  "tags": [
			    "a",
			    "b",
			  ],
			}
		`);
	let item4 = await clientA.items.get('4').resolved;
	// will be pruned but usable
	expect(item4.getSnapshot()).toMatchInlineSnapshot(`
		{
		  "contents": "empty",
		  "id": "4",
		  "listId": null,
		  "newField": 'should be here!',
		  "tags": [],
		}
	`);
	let item5 = await clientA.items.get('5').resolved;
	expect(item5.getSnapshot()).toMatchInlineSnapshot(`
		{
		  "contents": "so long",
		  "id": "5",
		  "listId": null,
		  "newField": 'should be here!',
		  "tags": [
		    "a",
		    "b",
		    "c",
		    "d",
		  ],
		}
	`);
});

it('supports skip migrations in real life', async () => {
	const v1Item = collection({
		name: 'item',
		primaryKey: 'id',
		fields: {
			id: { type: 'string' },
			contents: { type: 'string', nullable: true },
			tags: { type: 'array', items: { type: 'string' } },
		},
	});
	const v1Schema = schema({
		version: 1,
		collections: {
			items: v1Item,
		},
	});

	let migrations: Migration<any>[] = [createMigration(v1Schema)];

	const clientInit = {
		migrations,
		library: 'test',
		user: 'a',
	};

	// @ts-ignore
	let client = await createTestClient({
		schema: v1Schema,
		...clientInit,
		// logId: 'client1',
	});

	log('📈 Version 1 client created');

	await client.items.put({
		id: '1',
		contents: 'hello',
	});
	await client.items.put({
		id: '2',
		contents: 'world',
	});
	await client.items.put({
		id: '3',
		tags: ['a', 'b'],
	});

	await client.close();

	const v2Item = collection({
		name: 'item',
		primaryKey: 'id',
		fields: {
			id: { type: 'string', default: () => 'default' },
			contents: { type: 'string', default: 'empty' },
			tags: { type: 'array', items: { type: 'string' } },
			listId: { type: 'string', nullable: true, indexed: true },
		},
		synthetics: {
			hasTags: {
				type: 'string',
				compute: (item) => (item.tags.length > 0 ? 'true' : 'false'),
			},
		},
		compounds: {
			contents_tag: {
				of: ['contents', 'tags'],
			},
		},
	});
	const v2List = collection({
		name: 'list',
		primaryKey: 'id',
		fields: {
			id: { type: 'string', default: 'something' },
			name: { type: 'string' },
			items: { type: 'array', items: { type: 'string' } },
			nullable: { type: 'string', nullable: true },
		},
	});

	const v2Schema = schema({
		version: 2,
		collections: {
			items: v2Item,
			lists: v2List,
		},
	});

	// this migration should be bypassed
	migrations.push(
		createMigration(v1Schema, v2Schema, async () => {
			throw new Error('should not be called');
		}),
	);

	const v3Item = collection({
		name: 'item',
		primaryKey: 'id',
		fields: {
			id: { type: 'string', default: () => 'default' },
			contents: { type: 'string', default: 'empty' },
			tags: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						name: {
							type: 'string',
						},
						color: {
							type: 'string',
						},
					},
				},
			},
			listId: { type: 'string', nullable: true, indexed: true },
		},
		synthetics: {
			hasTags: {
				type: 'string',
				compute: (item) => (item.tags.length > 0 ? 'true' : 'false'),
			},
			itemTags: {
				type: 'string[]',
				compute: (item) => item.tags.map((tag) => tag.name),
			},
		},
	});

	const v3Schema = schema({
		version: 3,
		collections: {
			items: v3Item,
			lists: v2List,
		},
	});

	migrations.push(
		createMigration(v2Schema, v3Schema, async () => {
			throw new Error('should not be called');
		}),
	);

	const v4List = collection({
		name: 'list',
		primaryKey: 'id',
		fields: {
			id: { type: 'string', default: () => 'default' },
			name: { type: 'string', default: 'empty' },
			items: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						...v3Item.fields,
					},
				},
			},
		},
	});

	const v4Schema = schema({
		version: 4,
		collections: {
			lists: v4List,
		},
	});

	migrations.push(
		createMigration(v3Schema, v4Schema, async () => {
			throw new Error('should not be called');
		}),
	);

	/**
	 * ⭐ The skip migration
	 */
	migrations.push(
		createMigration(v1Schema, v4Schema, async ({ mutations, queries }) => {
			const items = await queries.items.findAll();
			await mutations.lists.put({
				id: 'uncategorized',
				name: 'Uncategorized',
				items: items.map((i) => ({
					contents: i.contents || 'empty',
					id: i.id,
					listId: null,
					tags: i.tags.map((t: any) => ({
						name: t,
						color: 'red',
					})),
				})),
			});
		}),
	);

	client = await createTestClient({
		schema: v4Schema,
		...clientInit,
	});

	log('📈 Version 4 client created');

	const defaultList = await client.lists.get('uncategorized').resolved;
	expect(defaultList.getSnapshot()).toMatchInlineSnapshot(`
		{
		  "id": "uncategorized",
		  "items": [],
		  "name": "Uncategorized",
		}
	`);
});
