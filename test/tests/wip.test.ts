import {
	Migration,
	ReplicaType,
	createDefaultMigration,
	createMigration,
	migrate,
	schema,
} from '@verdant-web/common';
import { ClientWithCollections, StorageDescriptor } from '@verdant-web/store';
import { expect, it } from 'vitest';
import defaultSchema from '../schema.js';

async function createTestClient({
	schema,
	migrations,
	server,
	library,
	user,
	type = ReplicaType.Realtime,
	logId,
	indexedDb,
}: {
	schema: any;
	migrations: Migration<any>[];
	server?: { port: number };
	library: string;
	user: string;
	type?: ReplicaType;
	logId?: string;
	indexedDb: IDBFactory;
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
	});
	const client = await desc.open();
	return client as ClientWithCollections;
}

it('applies a WIP schema over an old schema and discards it once the new version is ready', async () => {
	// first set up with the default schema
	const baseClientOptions = {
		schema: defaultSchema,
		library: 'wip-1',
		migrations: [createMigration(defaultSchema)],
		user: 'a',
		indexedDb: new IDBFactory(),
	};
	const client = await createTestClient(baseClientOptions);

	await client.items.put({
		id: '1',
		content: 'test item',
		tags: ['a'],
		comments: [
			{
				id: 'comment-1',
				content: 'test comment',
				authorId: 'author-1',
			},
		],
	});

	await client.close();

	// create a WIP schema with some proposed changes.
	// these changes are destructive. if not discarded correctly
	// they should cause problems for the final schema.
	const wipSchema = schema({
		...defaultSchema,
		collections: {
			...defaultSchema.collections,
			items: {
				...defaultSchema.collections.items,
				fields: {
					...defaultSchema.collections.items.fields,
					comments: schema.fields.array({
						items: schema.fields.string(),
					}),
				},
			},
		},
		version: 2,
		wip: true,
	});

	console.info('🚩 Opening WIP client');
	const wipClient = await createTestClient({
		...baseClientOptions,
		schema: wipSchema,
		migrations: [
			createMigration(defaultSchema),
			createMigration(defaultSchema, wipSchema, async ({ migrate }) => {
				await migrate('items', ({ comments, ...old }) => ({
					...old,
					// no idea what's up with this typing
					comments: comments.map((c: any) => c.content) as unknown as never,
				}));
			}),
		],
	});

	const wipItem = await wipClient.items.get('1').resolved;
	expect(wipItem.getSnapshot().comments).toMatchInlineSnapshot(`
		[
		  "test comment",
		]
	`);

	// make some changes
	await wipClient.items.delete(wipItem.get('id'));
	await wipClient.categories.put({
		name: 'ephemeral',
	});

	await wipClient.close();

	console.info('🚩 WIP client work complete');

	// what happens when we open v1 again?
	const client1Again = await createTestClient(baseClientOptions);

	const item1Again = await client1Again.items.get('1').resolved;
	expect(item1Again.getSnapshot()).toMatchInlineSnapshot(`
		{
		  "categoryId": null,
		  "comments": [
		    {
		      "authorId": "author-1",
		      "content": "test comment",
		      "id": "comment-1",
		    },
		  ],
		  "content": "test item",
		  "id": "1",
		  "image": null,
		  "purchased": false,
		  "tags": [
		    "a",
		  ],
		}
	`);

	await client1Again.close();

	// now go to a real v2

	const v2Schema = schema({
		...defaultSchema,
		version: 2,
		collections: {
			...defaultSchema.collections,
			categories: {
				...defaultSchema.collections.categories,
				fields: {
					...defaultSchema.collections.categories.fields,
					icon: schema.fields.string({
						default: '',
					}),
				},
			},
		},
	});

	const client2 = await createTestClient({
		...baseClientOptions,
		schema: v2Schema,
		migrations: [
			...baseClientOptions.migrations,
			createMigration(defaultSchema, v2Schema, async () => {}),
		],
	});

	const item2 = await client2.items.get('1').resolved;
	expect(item2.getSnapshot()).toMatchInlineSnapshot(`
		{
		  "categoryId": null,
		  "comments": [
		    {
		      "authorId": "author-1",
		      "content": "test comment",
		      "id": "comment-1",
		    },
		  ],
		  "content": "test item",
		  "id": "1",
		  "image": null,
		  "purchased": false,
		  "tags": [
		    "a",
		  ],
		}
	`);
});

it('can start a WIP schema from no pre-existing client', async () => {
	// create a WIP schema with some proposed changes.
	// these changes are destructive. if not discarded correctly
	// they should cause problems for the final schema.
	const wipSchema = schema({
		...defaultSchema,
		collections: {
			...defaultSchema.collections,
			items: {
				...defaultSchema.collections.items,
				fields: {
					...defaultSchema.collections.items.fields,
					comments: schema.fields.array({
						items: schema.fields.string(),
					}),
				},
			},
		},
		version: 1,
		wip: true,
	});

	const wipClient = await createTestClient({
		library: 'wip-from-scratch',
		user: 'A',
		indexedDb: new IDBFactory(),
		schema: wipSchema,
		migrations: [createMigration(wipSchema)],
	});

	// make some changes
	await wipClient.items.put({ id: '1', content: 'test item' });
	await wipClient.categories.put({
		name: 'cat 1',
	});

	expect(await wipClient.items.findAll().resolved).toHaveLength(1);
	expect(await wipClient.categories.findAll().resolved).toHaveLength(1);

	// then it can go to v1, which will have no data
	const client = await createTestClient({
		library: 'wip-from-scratch',
		user: 'A',
		indexedDb: new IDBFactory(),
		schema: defaultSchema,
		migrations: [createMigration(defaultSchema)],
	});

	expect(await client.items.findAll().resolved).toHaveLength(0);
	expect(await client.categories.findAll().resolved).toHaveLength(0);
});
