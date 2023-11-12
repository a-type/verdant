import { ReplicaType } from '@verdant-web/server';
import {
	ClientWithCollections,
	collection,
	Entity,
	migrate,
	schema,
	StorageDescriptor,
} from '@verdant-web/store';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { startTestServer } from './lib/testServer.js';
// @ts-ignore
import { IDBFactory } from 'fake-indexeddb';
import { waitForCondition } from './lib/waits.js';

const fuzzCollectionSchema = collection({
	name: 'fuzz',
	fields: {
		id: { type: 'string' },
		data: { type: 'any' },
	},
	primaryKey: 'id',
});

const fuzzSchema = schema({
	version: 1,
	collections: {
		fuzz: fuzzCollectionSchema,
	},
});

async function createTestClient({
	user,
	logId,
	indexedDb = new IDBFactory(),
	server,
	logFilter = () => true,
}: {
	user: string;
	logId?: string;
	indexedDb?: IDBFactory;
	server?: { port: number };
	logFilter?: (log: any) => boolean;
}) {
	const library = 'fuzz';
	const type = ReplicaType.Realtime;
	const desc = new StorageDescriptor({
		// disableRebasing: true,
		schema: fuzzSchema,
		migrations: [
			migrate(fuzzSchema, async ({ mutations }) => {
				// create the default fuzz object
				// @ts-ignore - nested type instantiation issue again
				await mutations.fuzz.put({ id: 'default', data: {} });
			}),
		],
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
			? (...args: any[]) => {
					const filtered = args.filter(logFilter);
					if (filtered.length > 0) {
						console.log(`[${logId}]`, ...filtered);
					}
			  }
			: undefined,
		indexedDb,
	});
	const client = await desc.open();
	return client as ClientWithCollections;
}

function randomString() {
	return (
		Math.random().toString(36).substring(2, 15) +
		Math.random().toString(36).substring(2, 15)
	);
}

function randomInitialData(avoidLists = false) {
	if (Math.random() < 0.25) {
		return Math.floor(Math.random());
	} else if (Math.random() < 0.5) {
		return randomString();
	} else if (Math.random() < 0.75 && !avoidLists) {
		// random array
		const arr: any[] = [];
		for (let i = 0; i < Math.floor(Math.random() * 5); i++) {
			arr.push(randomInitialData(avoidLists));
		}
		return arr;
	} else {
		// random object
		const obj: any = {};
		for (let i = 0; i < Math.floor(Math.random() * 5); i++) {
			obj[Math.random().toString(36).substring(2, 15)] =
				randomInitialData(avoidLists);
		}
		return obj;
	}
}

async function fuzz(
	client: ClientWithCollections,
	{
		avoidLists = false,
		avoidDelete = false,
	}: { avoidLists?: boolean; avoidDelete?: boolean } = {},
) {
	const obj = await getFuzz(client);
	const targetDepth = Math.floor(Math.random() * 10);
	let current: Entity = obj;
	// randomly traverse the structure until we reach the target depth
	// or run out of children
	for (let i = 0; i < targetDepth; i++) {
		if (!current) break;

		if (!current.isList) {
			const keys: string[] = current.keys();
			if (keys.length === 0) {
				break;
			}
			const key = keys[Math.floor(Math.random() * keys.length)];
			const next: any = current.get(key);
			if (next instanceof Entity) {
				current = next;
			} else {
				break;
			}
		} else if (!avoidLists) {
			if (current.length === 0) {
				break;
			}
			const next: any = current.get(Math.floor(Math.random() * current.length));
			if (next instanceof Entity) {
				current = next;
			} else {
				break;
			}
		}
	}

	// now, do the operation at whatever level we ended up at
	if (!current) return;

	// UPSERT
	if (Math.random() < 0.6 || avoidDelete) {
		if (!current.isList) {
			const keys: string[] = current.keys();
			const key = keys.length
				? keys[Math.floor(Math.random() * keys.length)]
				: randomString();
			current.set(key, randomInitialData(avoidLists));
		} else {
			if (Math.random() < 0.2) {
				// testing set adding with the same value
				current.add(Math.random() < 0.5 ? 'fuzz' : 'bazz');
			} else {
				current.set(
					Math.floor(Math.random() * Math.max(1, current.length)),
					randomInitialData(avoidLists),
				);
			}
		}
		// DELETE
	} else {
		if (!current.isList) {
			const keys: string[] = current.keys();
			if (keys.length === 0) {
				return;
			}
			const key = keys[Math.floor(Math.random() * keys.length)];
			current.delete(key);
		} else {
			if (current.length === 0) {
				return;
			}
			current.delete(Math.floor(Math.random() * current.length));
		}
	}
}

async function waitForConsistency(
	client1: ClientWithCollections,
	client2: ClientWithCollections,
) {
	let attempts = 0;
	await waitForCondition(async () => {
		attempts++;
		const fuzz1 = await getFuzz(client1);
		const fuzz2 = await getFuzz(client2);
		return (
			!!fuzz1 &&
			!!fuzz2 &&
			JSON.stringify(fuzz1?.getSnapshot()) ===
				JSON.stringify(fuzz2?.getSnapshot())
		);
	});
	const finalFuzz1 = await getFuzz(client1);
	const finalFuzz2 = await getFuzz(client2);
	expect(JSON.stringify(finalFuzz1?.getSnapshot())).toEqual(
		JSON.stringify(finalFuzz2?.getSnapshot()),
	);
}

async function getFuzz(client: ClientWithCollections) {
	const fuzz = client.fuzz.get('default');
	return (await fuzz.resolved)?.get('data');
}

const avoidLists = false;
const avoidDelete = false;
const fuzzCount = 50;

let server: { cleanup: () => Promise<void>; port: number };

beforeAll(async () => {
	server = await startTestServer({
		// log: true,
		// disableRebasing: true,
	});
});
afterAll(() => {
	return server.cleanup();
}, 30 * 1000);

it(
	'withstands numerous arbitrary changes to data from clients offline and online and arrives at consistency',
	async () => {
		const client1IndexedDB = new IDBFactory();
		const client1 = await createTestClient({
			user: 'a',
			server,
			indexedDb: client1IndexedDB,
			// logId: 'a',
			logFilter: (log) =>
				`${log}`.startsWith('Inserting') ||
				`${log}`.startsWith('Enqueueing') ||
				`${log}`.startsWith('Starting'),
		});
		const client2IndexedDB = new IDBFactory();
		const client2 = await createTestClient({
			user: 'b',
			server,
			indexedDb: client2IndexedDB,
			// logId: 'b',
			logFilter: (log) =>
				`${log}`.startsWith('Inserting') ||
				`${log}`.startsWith('Enqueueing') ||
				`${log}`.startsWith('Starting'),
		});

		// make a bunch of random changes to the data
		let promises: Promise<any>[] = [];
		for (let i = 0; i < fuzzCount; i++) {
			promises.push(fuzz(client1, { avoidLists, avoidDelete }));
			promises.push(fuzz(client2, { avoidLists, avoidDelete }));
		}

		// purposefully sync while things are still happening
		client1.sync.start();
		client2.sync.start();

		await Promise.all(promises);

		await waitForConsistency(client1, client2);
		console.info('✅ Initial consistency achieved');

		for (let i = 0; i < fuzzCount; i++) {
			fuzz(client1, { avoidLists, avoidDelete });
			fuzz(client2, { avoidLists, avoidDelete });
		}

		await waitForConsistency(client1, client2);
		console.info('✅ Online consistency achieved');

		client1.sync.stop();
		client2.sync.stop();

		await new Promise((resolve) => setTimeout(resolve, 1000));

		for (let i = 0; i < fuzzCount; i++) {
			fuzz(client1, { avoidLists, avoidDelete });
			fuzz(client2, { avoidLists, avoidDelete });
		}

		client1.sync.start();
		client2.sync.start();

		await waitForConsistency(client1, client2);
		console.info('✅ Offline consistency achieved');
	},
	{ timeout: 30 * 1000 },
);
