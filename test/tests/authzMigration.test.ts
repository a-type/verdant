import { createMigration, Migration, schema } from '@verdant-web/common';
import { authorization, ClientWithCollections } from '@verdant-web/store';
import { expect, it } from 'vitest';
import { startTestServer } from '../lib/testServer.js';
import { waitForQueryResult } from '../lib/waits.js';
import { createTestClient } from '../lib/testClient.js';

async function createClient({
	schema,
	migrations,
	server,
	library,
	user,
	logId,
	disableRebasing,
	indexedDb = new IDBFactory(),
	oldSchemas,
}: {
	schema: any;
	migrations: Migration<any>[];
	server?: { port: number };
	library: string;
	user: string;
	logId?: string;
	disableRebasing?: boolean;
	indexedDb?: IDBFactory;
	oldSchemas: any[];
}): Promise<ClientWithCollections> {
	const client = await createTestClient({
		schema,
		migrations,
		library,
		user,
		server,
		logId,
		disableRebasing,
		oldSchemas,
		indexedDb,
	});
	return client as any as ClientWithCollections;
}

it('does not expose private documents when migrating', async () => {
	const server = await startTestServer();

	const v1Item = schema.collection({
		name: 'item',
		primaryKey: 'id',
		fields: {
			id: schema.fields.string(),
			contents: schema.fields.string({ nullable: true }),
			tags: schema.fields.array({ items: schema.fields.string() }),
		},
	});
	const v1Schema = schema({
		version: 1,
		collections: {
			items: v1Item,
		},
	});

	let migrations: Migration<any>[] = [
		createMigration(v1Schema, async ({ mutations }) => {
			await mutations.items.put(
				{
					id: 'private-1',
					contents: 'private',
				},
				{ access: authorization.private },
			);
		}),
	];

	const clientInit = {
		migrations,
		library: 'test',
		user: 'a',
		indexedDb: new IDBFactory(),
	};

	let client = await createClient({
		schema: v1Schema,
		oldSchemas: [v1Schema],
		...clientInit,
	});

	const item = await client.items.findOne().resolved;
	expect(item).not.toBeNull();

	expect(item.access).toBe(authorization.private);

	const v2Item = schema.collection({
		name: 'item',
		primaryKey: 'id',
		fields: {
			id: schema.fields.string({ default: () => 'default' }),
			contents: schema.fields.string({ default: 'empty' }),
			tags: schema.fields.array({ items: schema.fields.string() }),
			listId: schema.fields.string({ nullable: true }),
		},
		indexes: {
			listId: {
				field: 'listId',
			},
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

	migrations.push(createMigration(v1Schema, v2Schema, async () => {}));

	client = await createClient({
		schema: v2Schema,
		oldSchemas: [v1Schema, v2Schema],
		server,
		...clientInit,
	});

	const item2 = await client.items.findOne().resolved;
	expect(item2).not.toBeNull();

	// assert access is applied
	expect(item2.access).toBe(authorization.private);

	// let's create a public item to test...
	const publicItem = await client.items.put({ content: 'public' });

	// check to see if an unrelated user can see the
	// private doc
	await client.sync.start();

	const client2 = await createClient({
		schema: v2Schema,
		oldSchemas: [v1Schema, v2Schema],
		server,
		...clientInit,
		user: 'B',
	});
	await client2.sync.start();

	const client2PublicItemQuery = client2.items.get(publicItem.get('id'));
	await waitForQueryResult(client2PublicItemQuery);

	expect(await client2.items.get(item2.get('id')).resolved).toBeNull();
});
