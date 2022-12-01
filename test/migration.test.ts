import { it, expect, describe } from 'vitest';
import {
	schema,
	collection,
	StorageDescriptor,
	Migration,
	createDefaultMigration,
	migrate,
} from '@lo-fi/web';
import { ReplicaType } from '@lo-fi/server';
// @ts-ignore
import { IDBFactory } from 'fake-indexeddb';

async function createTestClient({
	schema,
	migrations,
	server,
	library,
	user,
	type = ReplicaType.Realtime,
	logId,
	indexedDb = new IDBFactory(),
}: {
	schema: any;
	migrations: Migration<any>[];
	server?: { port: number };
	library: string;
	user: string;
	type?: ReplicaType;
	logId?: string;
	indexedDb?: IDBFactory;
}): Promise<any> {
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
	});
	const client = await desc.open();
	return client;
}

async function closeAllDatabases(indexedDB: IDBFactory) {}

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
				contents: { type: 'string' },
				tags: { type: 'array', items: { type: 'string' } },
			},
		});
		const v1Schema = schema({
			version: 1,
			collections: {
				item: v1Item,
			},
		});

		let migrations: Migration<any>[] = [createDefaultMigration(v1Schema)];

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

		console.debug('📈 Version 1 client created');

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
			contents: 'foo',
			tags: ['a', 'b'],
		});

		await client.close();
		await closeAllDatabases(indexedDb);
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
			},
		});

		const v2Schema = schema({
			version: 2,
			collections: {
				item: v2Item,
				list: v2List,
			},
		});

		migrations.push(createDefaultMigration(v1Schema, v2Schema));

		client = await createTestClient({
			schema: v2Schema,
			...clientInit,
			logId: 'client2',
		});

		console.debug('📈 Version 2 client created');

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

		// check our new indexes
		const emptyResults = await client.items.findAll({
			where: 'hasTags',
			equals: 'false',
		}).resolved;
		expect(emptyResults.length).toBe(1);

		const compoundResults = await client.items.findAll({
			where: 'contents_tag',
			match: {
				contents: 'foo',
				tags: 'a',
			},
		}).resolved;
		expect(compoundResults.length).toBe(1);

		// create some more test data
		let list1 = await client.lists.create({
			id: 'list1',
			name: 'list 1',
		});

		let item3 = await client.items.create({
			listId: list1.get('id'),
		});
		expect(item3.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "contents": "empty",
			  "id": "default",
			  "listId": "list1",
			  "tags": [],
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

		const v3Schema = schema({
			version: 3,
			collections: {
				item: v3Item,
				list: v2List,
			},
		});

		migrations.push(
			migrate(v2Schema, v3Schema, async ({ migrate }) => {
				await migrate('item', ({ tags, ...rest }) => {
					return {
						...rest,
						tags: tags.map((tag) => ({
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

		console.debug('📈 Version 3 client created');

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
			  "contents": "foo",
			  "id": "3",
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
			  ],
			}
		`);

		await client.close();

		// for our last act... move items into lists inside lists!
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
				list: v4List,
			},
		});

		migrations.push(
			migrate(v3Schema, v4Schema, async ({ migrate, queries, mutations }) => {
				await migrate('list', async (old) => {
					const items = await queries.item.findAll({
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
				const unassignedItems = await queries.item.findAll({
					where: 'listId',
					equals: null,
				});
				await mutations.list.put({
					id: 'uncategorized',
					name: 'Uncategorized',
					items: unassignedItems,
				});
			}),
		);

		client = await createTestClient({
			schema: v4Schema,
			...clientInit,
		});

		console.debug('📈 Version 4 client created');

		// check our test items
		const defaultList = await client.lists.get('uncategorized').resolved;
		expect(defaultList.getSnapshot()).toMatchInlineSnapshot(`
			{
			  "id": "uncategorized",
			  "items": [],
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
			      "id": "default",
			      "listId": "list1",
			      "tags": [],
			    },
			  ],
			  "name": "list 1",
			}
		`);
	},
	15 * 1000,
);

it.todo(
	'migrates in an online world where old operations still come in',
	async () => {},
);
