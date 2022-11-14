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
	migrations: Migration[];
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

		let migrations = [createDefaultMigration(v1Schema)];

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
		});

		// create some initial data
		await client.items.create({
			id: '1',
			contents: 'hello',
		});
		await client.items.create({
			id: '2',
			contents: 'world',
			tags: ['a', 'b', 'c'],
		});
		await client.items.create({
			id: '3',
			contents: 'foo',
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
		});

		// check our test items
		let item1 = await client.items.get('1').resolved;
		expect(item1.getSnapshot()).toMatchInlineSnapshot(`
		{
		  "contents": "hello",
		  "id": "1",
		  "tags": [],
		}
	`);
		let item2 = await client.items.get('2').resolved;
		expect(item2.getSnapshot()).toMatchInlineSnapshot(`
		{
		  "contents": "world",
		  "id": "2",
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
		let item3 = await client.items.create({});
		expect(item3.getSnapshot()).toMatchInlineSnapshot(`
		{
		  "contents": "empty",
		  "id": "default",
		  "tags": [],
		}
	`);

		await client.lists.create({
			name: 'list 1',
		});

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

		// check our test items
		item1 = await client.items.get('1').resolved;
		expect(item1.getSnapshot()).toMatchInlineSnapshot(`
		{
		  "contents": "hello",
		  "id": "1",
		  "tags": [],
		}
	`);
		item2 = await client.items.get('2').resolved;
		expect(item2.getSnapshot()).toMatchInlineSnapshot(`
		{
		  "contents": "world",
		  "id": "2",
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
	},
	60 * 1000,
);

it.todo(
	'migrates in an online world where old operations still come in',
	async () => {},
);
