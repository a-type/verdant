import {
	ClientWithCollections,
	createMigration,
	Migration,
	schema,
} from '@verdant-web/store';
import { expect, it, vi, vitest } from 'vitest';
import {
	waitForFileLoaded,
	waitForMockCall,
	waitForQueryResult,
} from '../lib/waits.js';
import { createTestFile } from '../lib/createTestFile.js';
import { createTestClient } from '../lib/testClient.js';

async function createClient({
	schema,
	migrations,
	server,
	library,
	user,
	logId,
	oldSchemas,
}: {
	schema: any;
	migrations: Migration<any>[];
	server?: { port: number };
	library: string;
	user: string;
	logId?: string;
	oldSchemas: any[];
}): Promise<ClientWithCollections> {
	const client = await createTestClient({
		schema,
		migrations,
		library,
		user,
		server,
		logId,
		oldSchemas,
	});
	return client as any;
}

it('can export data and import it even after a schema migration', async () => {
	const v1Item = schema.collection({
		name: 'item',
		primaryKey: 'id',
		fields: {
			id: schema.fields.string(),
			contents: schema.fields.string(),
			tags: schema.fields.array({ items: schema.fields.string() }),
			file: schema.fields.file({ nullable: true }),
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
		// logId: 'A',
	};

	const onFileAdded = vi.fn();
	let client = await createClient({
		schema: v1Schema,
		oldSchemas: [v1Schema],
		...clientInit,
	});
	client.subscribe('fileSaved', onFileAdded);

	const originalLocalReplicaInfo =
		await client.__persistence.meta.getLocalReplica();

	// add test data
	await client.items.put({
		id: '1',
		contents: 'hello',
	});
	await client.items.put({
		id: '2',
		contents: 'world',
		tags: ['a', 'b', 'c'],
		file: createTestFile('file 1'),
	});
	await client.items.put({
		id: '3',
		contents: 'foo',
		tags: ['a', 'b'],
		file: createTestFile('file 2 a different file'),
	});

	await client.entities.flushAllBatches();

	// wait for files to be saved to disk
	await waitForMockCall(onFileAdded, 2);

	const exported = await client.export();
	expect(exported.fileData.length).toBe(2);
	expect(exported.files.length).toBe(2);

	await client.close();

	const v2Item = schema.collection({
		name: 'item',
		primaryKey: 'id',
		fields: {
			id: schema.fields.string({ default: () => 'default' }),
			contents: schema.fields.string({ default: 'empty' }),
			tags: schema.fields.array({ items: schema.fields.string() }),
			listId: schema.fields.string({ nullable: true }),
			file: schema.fields.file({ nullable: true }),
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
	const v2List = schema.collection({
		name: 'list',
		primaryKey: 'id',
		fields: {
			id: schema.fields.string({ default: 'something' }),
			name: schema.fields.string(),
			items: schema.fields.array({ items: schema.fields.string() }),
		},
	});

	const v2Schema = schema({
		version: 2,
		collections: {
			items: v2Item,
			lists: v2List,
		},
	});

	migrations.push(createMigration(v1Schema, v2Schema));

	client = await createClient({
		schema: v2Schema,
		oldSchemas: [v1Schema, v2Schema],
		...clientInit,
		// logId: 'client2',
	});

	// add more data which will be lost
	await client.items.put({
		id: '4',
		contents: 'bar',
		tags: ['a', 'b'],
	});
	await client.items.put({
		id: '5',
		contents: 'baz',
		tags: ['a', 'b'],
	});

	// it gets assigned a new replica ID
	const newLocalReplicaInfo = await client.__persistence.meta.getLocalReplica();
	expect(newLocalReplicaInfo.id).not.to.equal(originalLocalReplicaInfo.id);

	// make some queries to see how they fare
	const itemsQuery = client.items.findAll();
	const itemsSubscriber = vitest.fn();
	itemsQuery.subscribe(itemsSubscriber);

	await waitForQueryResult(
		itemsQuery,
		(items) => {
			return items?.length === 2;
		},
		10000,
		'list all items before import',
	);

	await client.import(exported);

	await waitForQueryResult(
		itemsQuery,
		(items) => {
			return items?.length === 3;
		},
		10000,
		'list all items after import',
	);

	// lists should exist now (not throw)
	await client.lists.findAll().resolved;

	// it should have the same replica ID, not overwritten
	const finalLocalReplicaInfo =
		await client.__persistence.meta.getLocalReplica();
	expect(finalLocalReplicaInfo.id).not.to.equal(originalLocalReplicaInfo.id);

	// make sure the data is correct
	const items = await itemsQuery.resolved;

	// wait for all files to be loaded
	for (const item of items) {
		if (item.get('file')) {
			await waitForFileLoaded(item.get('file'));
		}
	}

	// file contents are different in different persistence environments.
	expect(items.map((item: any) => item.getSnapshot())).toEqual([
		{
			contents: 'hello',
			file: null,
			id: '1',
			tags: [],
			listId: null,
		},
		{
			contents: 'world',
			file: {
				id: expect.any(String),
				url: process.env.SQLITE ? expect.any(String) : 'blob:text/plain:6',
				name: 'test.txt',
				type: 'text/plain',
				remote: false,
				file: process.env.SQLITE ? undefined : expect.any(Blob),
			},
			id: '2',
			tags: ['a', 'b', 'c'],
			listId: null,
		},
		{
			contents: 'foo',
			file: {
				id: expect.any(String),
				url: process.env.SQLITE ? expect.any(String) : 'blob:text/plain:23',
				name: 'test.txt',
				remote: false,
				type: 'text/plain',
				file: process.env.SQLITE ? undefined : expect.any(Blob),
			},
			id: '3',
			tags: ['a', 'b'],
			listId: null,
		},
	]);
});
