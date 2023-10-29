import { Migration, StorageSchema, migrate } from '@verdant-web/common';
import defaultMigrations from './migrations/index.js';
import defaultSchema from './schema.js';
import { ClientWithCollections } from '@verdant-web/store';
// @ts-ignore
import { IDBFactory } from 'fake-indexeddb';
import { createTestContext } from './lib/createTestContext.js';
import { expect, it } from 'vitest';
import {
	waitForCondition,
	waitForOnline,
	waitForQueryResult,
} from './lib/waits.js';

const context = createTestContext();

function log(...msg: any[]) {
	console.debug('⚠️ ', ...msg);
}

it('maintains consistency in real world scenarios', async () => {
	const LIBRARY = 'longevity';

	const clientAIDB = new IDBFactory();
	const clientBIDB = new IDBFactory();

	function createClientA(
		schema: StorageSchema,
		migrations: Migration[],
	): Promise<ClientWithCollections> {
		return context.createTestClient({
			library: LIBRARY,
			user: 'A',
			indexedDb: clientAIDB,
			schema,
			migrations,
			// log: (...messages) => {
			// 	if (messages.some((m) => `${m}`.includes('a2'))) {
			// 		console.log(`[A${schema.version}]`, ...messages);
			// 	}
			// },
			// try to keep it realistic
			autoTransport: true,
		}) as any;
	}
	function createClientB(
		schema: StorageSchema,
		migrations: Migration[],
	): Promise<ClientWithCollections> {
		return context.createTestClient({
			library: LIBRARY,
			user: 'B',
			indexedDb: clientBIDB,
			schema,
			migrations,
			// logId: '[B]',
			// try to keep it realistic
			autoTransport: true,
		}) as any;
	}
	async function compareCollections(
		clientA: ClientWithCollections,
		clientB: ClientWithCollections,
		expectedItems: number,
	) {
		const aQuery = clientA.items.findAll({ key: '[a]findAll:items' });
		await waitForQueryResult(aQuery, (v) => v.length === expectedItems, 10000);
		const bQuery = clientB.items.findAll({ key: '[b]findAll:items' });
		await waitForQueryResult(bQuery, (v) => v.length === expectedItems, 10000);

		const aItems = await aQuery.resolved;
		const bItems = await bQuery.resolved;

		expect(aItems.length).toBe(expectedItems);
		expect(bItems.length).toBe(expectedItems);

		try {
			await waitForCondition(
				() => {
					for (let i = 0; i < expectedItems; i++) {
						if (
							JSON.stringify(aItems[i].getSnapshot()) !==
							JSON.stringify(bItems[i].getSnapshot())
						) {
							return false;
						}
					}
					return true;
				},
				10000,
				'Items should be equal',
			);
		} catch (err) {
			// gives a nicer diff...
			expect(aItems.map((i) => i.getSnapshot())).toEqual(
				bItems.map((i) => i.getSnapshot()),
			);
			throw err;
		}
	}

	const clientA1 = await createClientA(defaultSchema, defaultMigrations);
	const clientB1 = await createClientB(defaultSchema, defaultMigrations);

	async function makeItem(client: ClientWithCollections, id: string) {
		const item = await client.items.put({
			id,
			content: 'Apples',
		});
		return item;
	}

	async function deleteItem(client: ClientWithCollections, id: string) {
		await client.items.delete(id);
	}

	async function updateItem(client: ClientWithCollections, id: string) {
		const getItem = client.items.get(id);
		await waitForQueryResult(getItem, (v) => !!v, 5000);
		const current = await getItem.resolved;
		current.set('content', current.get('content') + '+');
	}

	// So here's what I'm going for:
	// Make some changes while synchronized and online together
	// One client goes offline for a while
	// Another client adds some things
	// The offline client makes some changes to shared items and adds some new ones
	// The offline client comes back online
	// Make sure they have 1) the same data, 2) all the data
	// Client goes offline again
	// First client keeps making changes and adding
	// A migration happens
	// Second client comes online, migrates, and makes changes
	// First client stays online, syncs
	// First client goes offline
	// First client comes online with new schema, migrates, syncs.
	// Make sure they have 1) the same data, 2) all the data

	clientA1.sync.start();
	clientB1.sync.start();

	log('Started clients');

	await makeItem(clientA1, 'a1'); // Items: 1
	await makeItem(clientA1, 'a2'); // Items: 2
	await updateItem(clientA1, 'a1');

	// wait for B to get initial state of library
	await waitForQueryResult(clientB1.items.findAll(), (v) => v.length === 2);
	await updateItem(clientB1, 'a1');
	await makeItem(clientB1, 'b1'); // Items: 3

	log('Initial data ready');

	clientB1.sync.stop();
	await waitForOnline(clientB1, false);
	log('Client B offline');

	await makeItem(clientA1, 'a3'); // Items: 4
	await makeItem(clientA1, 'a4'); // Items: 5
	await updateItem(clientA1, 'a2');
	await updateItem(clientA1, 'a3');
	await deleteItem(clientA1, 'a1'); // Items: 4
	log('Client A changes done');

	await makeItem(clientB1, 'b2'); // Items: 5
	await makeItem(clientB1, 'b3'); // Items: 6
	await updateItem(clientB1, 'a1');
	await updateItem(clientB1, 'a2');
	log('Client B changes done');

	clientB1.sync.start();
	await waitForOnline(clientB1, true);
	log('Client B online');

	await compareCollections(clientA1, clientB1, 6);
	log('First comparison passed');

	await clientB1.close();
	log('Client B closed');

	await makeItem(clientA1, 'a5'); // Items: 7
	await updateItem(clientA1, 'a2');
	await updateItem(clientA1, 'a3');
	await deleteItem(clientA1, 'a4'); // Items: 6
	log('Client A modifications done');

	const schemaV2 = {
		...defaultSchema,
		version: 2,
		collections: {
			...defaultSchema.collections,
			items: {
				...defaultSchema.collections.items,
				fields: {
					...defaultSchema.collections.items.fields,
					test: {
						type: 'number' as const,
						default: 100,
					},
				},
			},
		},
	};
	const migrationsV2 = [
		...defaultMigrations,
		migrate(defaultSchema, schemaV2, async () => {}),
	];

	const clientB2 = await createClientB(schemaV2, migrationsV2);
	clientB2.sync.start();
	await waitForOnline(clientB2, true);
	log('Client B online and migrated');

	await makeItem(clientB2, 'b4'); // Items: 7
	await updateItem(clientB2, 'a2');
	await updateItem(clientB2, 'a3');
	await makeItem(clientA1, 'a6'); // Items: 8
	await updateItem(clientA1, 'a2');
	log('Client B modifications done');

	await clientA1.close();
	log('Client A closed');

	const clientA2 = await createClientA(schemaV2, migrationsV2);
	log('Client A opened');
	clientA2.sync.start();
	await waitForOnline(clientA2, true);
	log('Client A online and migrated');

	await compareCollections(clientA2, clientB2, 8);
	log('Second comparison passed');
}, 30000);
