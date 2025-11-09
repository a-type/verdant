import { createMigration, schema } from '@verdant-web/common';
import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import defaultSchema from '../schema.js';

it('applies a WIP schema over an old schema and discards it once the new version is ready', async () => {
	const { log, createGenericClient } = createTestContext({
		library: 'wip-1',
	});
	// first set up with the default schema
	const baseClientOptions = {
		schema: defaultSchema,
		migrations: [createMigration(defaultSchema)],
		user: 'a',
		// logId: 'A',
		oldSchemas: [defaultSchema],
	};
	const client = createGenericClient(baseClientOptions);

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
	const wipClient = createGenericClient({
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
		// logId: 'wip',
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
	const client1Again = createGenericClient(baseClientOptions);
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

	const client2 = createGenericClient({
		...baseClientOptions,
		schema: v2Schema,
		oldSchemas: [defaultSchema, v2Schema],
		migrations: [
			...baseClientOptions.migrations,
			createMigration(defaultSchema, v2Schema),
		],
		// logId: 'A2',
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

	await client2.close();

	// make a wip v3 over the confirmed v2
	const wipSchema3 = schema({
		...v2Schema,
		version: 3,
		wip: true,
	});

	const client3 = createGenericClient({
		...baseClientOptions,
		schema: wipSchema3,
		oldSchemas: [defaultSchema, v2Schema, wipSchema3],
		migrations: [
			...baseClientOptions.migrations,
			createMigration(defaultSchema, v2Schema),
			createMigration(v2Schema, wipSchema3),
		],
		// logId: 'A3 wip',
	});

	// data is copied.
	const item3 = await client3.items.get('1').resolved;
	expect(item3.getSnapshot()).toMatchInlineSnapshot(`
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

	// close and reopen to confirm it's still there
	await client3.close();

	const client3Again = createGenericClient({
		...baseClientOptions,
		schema: v2Schema,
		oldSchemas: [defaultSchema, v2Schema, wipSchema3],
		migrations: [
			...baseClientOptions.migrations,
			createMigration(defaultSchema, v2Schema, async () => {}),
			createMigration(v2Schema, wipSchema3, async () => {}),
		],
		logId: 'A3',
	});

	const item3Again = await client3Again.items.get('1').resolved;
	expect(item3Again.getSnapshot()).toMatchInlineSnapshot(`
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
	const { createGenericClient } = createTestContext({
		library: 'wip-from-scratch',
	});
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

	const wipClient = createGenericClient({
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
	const client = createGenericClient({
		user: 'A',
		schema: defaultSchema,
		oldSchemas: [defaultSchema],
		migrations: [createMigration(defaultSchema)],
		// logId: 'A v1',
	});

	expect(await client.items.findAll().resolved).toHaveLength(0);
	expect(await client.categories.findAll().resolved).toHaveLength(0);
});
