import { ReplicaType } from '@verdant-web/server';
import {
	collection,
	createMigration,
	Migration,
	schema,
	StorageDescriptor,
} from '@verdant-web/store';
import { expect, it, vitest } from 'vitest';
import { waitForQueryResult } from './lib/waits.js';
import { createTestFile } from './lib/createTestFile.js';

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

// TODO: restore when this is supported again?
it.skip('can export data and import it even after a schema migration', async () => {
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
	};

	// @ts-ignore
	let client = await createTestClient({
		schema: v1Schema,
		...clientInit,
		// logId: 'client1',
	});

	const originalLocalReplicaInfo = await client.meta.localReplica.get();

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

	const exported = await client.export();

	await client.close();

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
	const v2List = collection({
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

	client = await createTestClient({
		schema: v2Schema,
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
	const newLocalReplicaInfo = await client.meta.localReplica.get();
	expect(newLocalReplicaInfo.id).not.to.equal(originalLocalReplicaInfo.id);

	// make some queries to see how they fare
	const itemsQuery = client.items.findAll();
	const itemsSubscriber = vitest.fn();
	itemsQuery.subscribe(itemsSubscriber);

	await waitForQueryResult(itemsQuery, (items) => {
		return items?.length === 2;
	});

	await client.import(exported);

	await waitForQueryResult(itemsQuery, (items) => {
		// console.log(items?.length);
		return items?.length === 3;
	});

	// lists should exist now (not throw)
	await client.lists.findAll().resolved;

	// it should have the same replica ID, not overwritten
	const finalLocalReplicaInfo = await client.meta.localReplica.get();
	expect(finalLocalReplicaInfo.id).not.to.equal(originalLocalReplicaInfo.id);

	// make sure the data is correct
	const items = await itemsQuery.resolved;
	expect(items.map((item: any) => item.getSnapshot())).toEqual([
		{
			contents: 'hello',
			file: null,
			id: '1',
			tags: [],
		},
		{
			contents: 'world',
			file: {
				id: expect.any(String),
				url: 'blob:text/plain:6',
			},
			id: '2',
			tags: ['a', 'b', 'c'],
		},
		{
			contents: 'foo',
			file: {
				id: expect.any(String),
				url: 'blob:text/plain:23',
			},
			id: '3',
			tags: ['a', 'b'],
		},
	]);
});
