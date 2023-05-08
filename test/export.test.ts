import { ReplicaType } from '@verdant-web/server';
import {
	collection,
	createDefaultMigration,
	Migration,
	schema,
	StorageDescriptor,
} from '@verdant-web/store';
import { expect, it, vitest } from 'vitest';
import { waitForQueryResult } from './lib/waits.js';

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

it('can export data and import it even after a schema migration', async () => {
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
			items: v1Item,
		},
	});

	let migrations: Migration<any>[] = [createDefaultMigration(v1Schema)];

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
	});
	await client.items.put({
		id: '3',
		contents: 'foo',
		tags: ['a', 'b'],
	});

	const exported = await client.export();

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
		},
	});

	const v2Schema = schema({
		version: 2,
		collections: {
			items: v2Item,
			lists: v2List,
		},
	});

	migrations.push(createDefaultMigration(v1Schema, v2Schema));

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

	await waitForQueryResult(itemsQuery, (items) => items?.length === 2);

	await client.import(exported);

	await waitForQueryResult(itemsQuery, (items) => items?.length === 3);

	// lists should exist now (not throw)
	await client.lists.findAll().resolved;

	// it should have the same replica ID, not overwritten
	const finalLocalReplicaInfo = await client.meta.localReplica.get();
	expect(finalLocalReplicaInfo.id).not.to.equal(originalLocalReplicaInfo.id);

	// make sure the data is correct
	const items = await itemsQuery.resolved;
	expect(items.map((item: any) => item.getSnapshot())).toMatchInlineSnapshot(`
		[
		  {
		    "contents": "hello",
		    "id": "1",
		    "tags": [],
		  },
		  {
		    "contents": "world",
		    "id": "2",
		    "tags": [
		      "a",
		      "b",
		      "c",
		    ],
		  },
		  {
		    "contents": "foo",
		    "id": "3",
		    "tags": [
		      "a",
		      "b",
		    ],
		  },
		]
	`);
});
