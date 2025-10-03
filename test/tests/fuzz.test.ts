import {
	ClientWithCollections,
	createMigration,
	Entity,
	schema,
} from '@verdant-web/store';
import { expect, it } from 'vitest';
// @ts-ignore
import { stableStringify } from '@verdant-web/common';
import { createTestContext } from '../lib/createTestContext.js';
import { createTestClient } from '../lib/testClient.js';
import { waitForCondition } from '../lib/waits.js';

const { server, log, library } = createTestContext({
	library: 'fuzz',
});

const fuzzCollectionSchema = schema.collection({
	name: 'fuzz',
	primaryKey: 'id',
	fields: {
		id: schema.fields.string(),
		data: schema.fields.any(),
	},
});

const fuzzSchema = schema({
	version: 1,
	collections: {
		fuzz: fuzzCollectionSchema,
	},
});

async function createClient({
	user,
	logId,
	server,
}: {
	user: string;
	logId?: string;
	server?: { port: number };
}) {
	const client = await createTestClient({
		// disableRebasing: true,
		schema: fuzzSchema,
		oldSchemas: [fuzzSchema],
		migrations: [
			createMigration(fuzzSchema, async ({ mutations }) => {
				// create the default fuzz object
				// @ts-ignore - nested type instantiation issue again
				await mutations.fuzz.put({ id: 'default', data: {} });
			}),
		],
		library,
		user,
		server,
		logId,
	});
	return client as any as ClientWithCollections;
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
			log(client.namespace, current.uid, 'set', key);
		} else {
			if (Math.random() < 0.2) {
				// testing set adding with the same value
				current.add(Math.random() < 0.5 ? 'fuzz' : 'bazz');
				log(client.namespace, current.uid, 'add');
			} else {
				const key = Math.floor(Math.random() * Math.max(1, current.length));
				current.set(key, randomInitialData(avoidLists));
				log(client.namespace, current.uid, 'set', key);
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
			log(client.namespace, current.uid, 'delete', key);
		} else {
			if (current.length === 0) {
				return;
			}
			const key = Math.floor(Math.random() * current.length);
			current.delete(key);
			log(client.namespace, current.uid, 'delete', key);
		}
	}
}

async function waitForConsistency(
	client1: ClientWithCollections,
	client2: ClientWithCollections,
	debugTag: string,
) {
	let attempts = 0;
	let snap1 = '';
	let snap2 = '';
	await waitForCondition(
		async () => {
			attempts++;
			const fuzz1 = await getFuzz(client1);
			const fuzz2 = await getFuzz(client2);
			snap1 = stableStringify(fuzz1?.getSnapshot());
			snap2 = stableStringify(fuzz2?.getSnapshot());
			return !!fuzz1 && !!fuzz2 && snap1 === snap2;
		},
		5000,
		async () => {
			const serverSnap = await server.getDocumentSnapshot(
				'fuzz',
				'fuzz',
				'default',
			);
			const fuzz1 = await getFuzz(client1);
			const fuzz2 = await getFuzz(client2);
			const fuzz1Pending = fuzz1.metadata.pendingOperations;
			const fuzz2Pending = fuzz2.metadata.pendingOperations;
			return `[${debugTag}] consistency (${attempts} attempts):

				${snap1}

				!==

				${snap2}

				Server version:

				${stableStringify(serverSnap)}

				[A pending]
				${stableStringify(fuzz1Pending)}

				[B pending]
				${stableStringify(fuzz2Pending)}`;
		},
	);
	const finalFuzz1 = await getFuzz(client1);
	const finalFuzz2 = await getFuzz(client2);
	expect(finalFuzz1?.getSnapshot()).toEqual(finalFuzz2?.getSnapshot());
}

async function getFuzz(client: ClientWithCollections) {
	const fuzz = client.fuzz.get('default');
	return (await fuzz.resolved)?.get('data');
}

const avoidLists = false;
const avoidDelete = false;
const fuzzCount = 50;

it(
	'withstands numerous arbitrary fuzz changes to data from clients offline and online and arrives at consistency',
	{ timeout: 60 * 1000 },
	async () => {
		const client1 = await createClient({
			user: 'a',
			server,
			// logId: 'a',
		});
		const client2 = await createClient({
			user: 'b',
			server,
			// logId: 'b',
		});

		// make a bunch of random changes to the data
		function doFuzzReturnPromise() {
			let promises: Promise<any>[] = [];
			for (let i = 0; i < fuzzCount; i++) {
				promises.push(fuzz(client1, { avoidLists, avoidDelete }));
				promises.push(fuzz(client2, { avoidLists, avoidDelete }));
			}
			return Promise.all(promises);
		}
		let fuzzPromise = doFuzzReturnPromise();

		// purposefully sync while things are still happening
		client1.sync.start();
		client2.sync.start();

		await fuzzPromise;

		await waitForConsistency(client1, client2, 'initial');
		log('✅ Initial consistency achieved');

		fuzzPromise = doFuzzReturnPromise();

		await waitForConsistency(client1, client2, 'online');
		log('✅ Online consistency achieved');

		await fuzzPromise;

		client1.sync.stop();
		client2.sync.stop();

		await new Promise((resolve) => setTimeout(resolve, 1000));

		// do all the work offline
		await doFuzzReturnPromise();

		client1.sync.start();
		client2.sync.start();

		await waitForConsistency(client1, client2, 'offline');
		log('✅ Offline consistency achieved');
	},
);
