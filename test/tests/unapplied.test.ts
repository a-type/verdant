import { createMigration, schema } from '@verdant-web/store';
import { expect, it, vitest } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';
import { getPersistence } from '../lib/persistence.js';
import { waitForMockCall, waitForQueryResult } from '../lib/waits.js';
import defaultMigrations from '../migrations/index.js';
import defaultSchema from '../schema.js';

const context = createTestContext({
	library: 'unapplied-1',
});

it('updates docs with unapplied operations after upgrading versions', async () => {
	const { server, createTestClient } = context;

	const persistence = getPersistence();

	const clientA = await createTestClient({
		server,
		user: 'User A',
		persistence,
		// logId: 'A',
	});
	const clientB = await createTestClient({
		server,
		user: 'User B',
		persistence,
		// logId: 'B',
	});

	const bHasSeenFuture = vitest.fn();
	clientB.subscribe('futureSeen', bHasSeenFuture);

	clientA.sync.start();
	clientB.sync.start();

	const a_apples = await clientA.items.put({
		content: 'Apples',
	});

	// wait for B to sync
	await waitForQueryResult(
		clientB.items.get(a_apples.get('id')),
		(item) => !!item,
		5000,
		"B should see A's item",
	);
	clientB.items.put({
		content: 'Oranges',
	});

	// wait for db to settle
	await new Promise((resolve) => setTimeout(resolve, 500));

	// upgrade A
	await clientA.close();
	await new Promise<void>((resolve) => resolve());
	await new Promise<void>((resolve) => resolve());

	const v2Schema = schema({
		version: 2,
		collections: {
			...defaultSchema.collections,
			items: {
				...defaultSchema.collections.items,
				fields: {
					...defaultSchema.collections.items.fields,
					// adding a new field to test future operation application on unmigrated client
					test: {
						type: 'number' as const,
						default: 100,
					},
				},
			},
		},
	});

	const clientA2 = await createTestClient({
		server,
		user: 'User A',
		migrations: [
			...defaultMigrations,
			// items should automigrate due to the field change
			createMigration(defaultSchema, v2Schema),
		],
		schema: v2Schema,
		persistence,
	});

	clientA2.sync.start();

	// ok, now we're in the future. any ops
	// should be ignored by B...
	const a2_bananas = await clientA2.items.put({
		content: 'Bananas',
	});
	const a2_apples = await clientA2.items.get(a_apples.get('id')).resolved;
	expect(a2_apples).not.toBeNull();
	a2_apples?.set('purchased', true);

	// now we wait for the future.
	await waitForMockCall(bHasSeenFuture);

	// B shouldn't be seeing these changes,
	// but it should get an event.
	expect(bHasSeenFuture).toHaveBeenCalled();
	expect(await clientB.items.get(a2_bananas.get('id')).resolved).toBeNull();

	expect((await clientB.items.findAll().resolved).length).toBe(2);

	// ok, now let's upgrade B
	await clientB.close();
	await new Promise<void>((resolve) => resolve());

	const clientB2 = await createTestClient({
		server,
		user: 'User B',
		migrations: [
			...defaultMigrations,
			createMigration(defaultSchema, v2Schema, async (tools) => {
				await tools.migrate('items', (item) => {
					// expect that the new field has not yet been applied to this snapshot -
					// the snapshot should represent the item from v1 only
					expect((item as any).test).toBe(undefined);
					return {
						...item,
						test: 100,
					};
				});
			}),
		],
		schema: v2Schema,
		persistence,
	});

	// B should now be able to query the changed items
	expect(
		await clientB2.items.get(a2_bananas.get('id')).resolved,
	).not.toBeNull();
	const apples = await clientB2.items.findOne({
		index: {
			where: 'purchasedYesNo',
			equals: 'yes',
		},
	}).resolved;
	expect(apples).not.toBe(null);
	const allItems = await clientB2.items.findAll().resolved;
	// Apples, Oranges, Bananas.
	// when originally diagnosing this problem, Bananas wouldn't
	// be in this list because it was created in the future and
	// therefore not written to storage, then subsequently not
	// re-written during migration because it did not exist in
	// storage, so the migration didn't know about it despite the
	// operations being in meta.
	expect(allItems.length).toBe(3);
});
