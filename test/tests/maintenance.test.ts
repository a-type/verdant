import {
	createMigration,
	decomposeOid,
	Migration,
	schema,
} from '@verdant-web/common';
import { expect, it } from 'vitest';
import { createTestContext } from '../lib/createTestContext.js';

const ctx = createTestContext({
	library: 'maintenance-1',
});

it('can purge metadata from deleted collections', async () => {
	const v1Item = schema.collection({
		name: 'item',
		primaryKey: 'id',
		fields: {
			id: schema.fields.string(),
			contents: schema.fields.string(),
		},
	});
	const v1Category = schema.collection({
		name: 'category',
		primaryKey: 'id',
		fields: {
			id: schema.fields.string(),
			name: schema.fields.string(),
		},
	});
	const v1Schema = schema({
		version: 1,
		collections: {
			items: v1Item,
			categories: v1Category,
		},
	});

	const migrations: Migration<any>[] = [createMigration(v1Schema)];

	const client1 = ctx.createGenericClient({
		schema: v1Schema,
		oldSchemas: [v1Schema],
		migrations,
		user: 'a',
	});

	await client1.items.put({
		id: 'item-1',
		contents: 'hello',
	});

	await client1.categories.put({
		id: 'category-1',
		name: 'category 1',
	});

	await client1.close();

	const v2Schema = schema({
		version: 2,
		collections: {
			items: v1Item,
		},
	});

	migrations.push(createMigration(v1Schema, v2Schema));

	const client2 = ctx.createGenericClient({
		schema: v2Schema,
		oldSchemas: [v1Schema, v2Schema],
		migrations,
		user: 'a',
	});

	// before purging we may see the old collection metadata
	const exported = await client2.export();
	expect(
		[...exported.data.baselines, ...exported.data.operations].some(
			(b) => decomposeOid(b.oid).collection === 'categories',
		),
	).toBe(true);

	// run the cleanup
	(await client2.__persistence.meta).__unstable__purgeRemovedCollections();

	// after purging we should no longer see the old collection metadata
	const exportedAfterPurge = await client2.export();
	expect(
		exportedAfterPurge.data.baselines.some(
			(b) => decomposeOid(b.oid).collection === 'categories',
		),
	).toBe(false);

	await client2.close();
});
