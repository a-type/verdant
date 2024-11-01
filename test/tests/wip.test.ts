import {
	Migration,
	StorageSchema,
	createMigration,
	schema,
} from '@verdant-web/common';
import {
	ClientWithCollections,
	PersistenceImplementation,
} from '@verdant-web/store';
import { expect, it } from 'vitest';
import defaultSchema from '../schema.js';
import { createTestClient } from '../lib/testClient.js';
import { getPersistence } from '../lib/persistence.js';

const testLog = true;
function log(...args: any[]) {
	if (testLog) {
		console.log('🔺', ...args);
	}
}

async function createClient({
	schema,
	migrations,
	server,
	library,
	user,
	logId,
	oldSchemas,
	persistence,
}: {
	schema: any;
	migrations: Migration<any>[];
	server?: { port: number };
	library: string;
	user: string;
	logId?: string;
	oldSchemas: StorageSchema[];
	persistence?: PersistenceImplementation;
}): Promise<ClientWithCollections> {
	const client = await createTestClient({
		schema,
		migrations,
		library,
		user,
		server,
		logId,
		oldSchemas,
		persistence,
	});
	return client as any as ClientWithCollections;
}

it('applies a WIP schema over an old schema and discards it once the new version is ready', async () => {
	// first set up with the default schema
	const baseClientOptions = {
		schema: defaultSchema,
		library: 'wip-1',
		migrations: [createMigration(defaultSchema)],
		user: 'a',
		logId: 'A',
		oldSchemas: [defaultSchema],
		persistence: getPersistence(),
	};
	const client = await createClient(baseClientOptions);

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
	log('closed client');

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

	log('opening wip client');
	const wipClient = await createClient({
		...baseClientOptions,
		schema: wipSchema,
		oldSchemas: [defaultSchema, wipSchema],
		migrations: [
			createMigration(defaultSchema),
			createMigration(defaultSchema, wipSchema, async ({ migrate }) => {
				await migrate('items', ({ comments, ...old }) => {
					log('migrating item', old.id);
					return {
						...old,
						// no idea what's up with this typing
						comments: comments.map((c: any) => c.content) as unknown as never,
					};
				});
			}),
		],
		logId: 'wip',
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
	log('closed wip client');

	// what happens when we open v1 again?
	const client1Again = await createClient(baseClientOptions);
	log('opened v1 client again');

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
	log('closed v1 client again');

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

	const client2 = await createClient({
		...baseClientOptions,
		schema: v2Schema,
		oldSchemas: [defaultSchema, v2Schema],
		migrations: [
			...baseClientOptions.migrations,
			createMigration(defaultSchema, v2Schema, async () => {}),
		],
	});
	log('opened v2 client');

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

	const wipClient = await createClient({
		library: 'wip-from-scratch',
		user: 'A',
		schema: wipSchema,
		migrations: [createMigration(wipSchema)],
		oldSchemas: [wipSchema],
		// logId: 'A',
	});

	// make some changes
	await wipClient.items.put({ id: '1', content: 'test item' });
	await wipClient.categories.put({
		name: 'cat 1',
	});

	expect(await wipClient.items.findAll().resolved).toHaveLength(1);
	expect(await wipClient.categories.findAll().resolved).toHaveLength(1);

	// then it can go to v1, which will have no data
	const client = await createClient({
		library: 'wip-from-scratch',
		user: 'A',
		schema: defaultSchema,
		oldSchemas: [defaultSchema],
		migrations: [createMigration(defaultSchema)],
		// logId: 'A v1',
	});

	expect(await client.items.findAll().resolved).toHaveLength(0);
	expect(await client.categories.findAll().resolved).toHaveLength(0);
});
