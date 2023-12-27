import { it } from 'vitest';
import { createTestContext } from './lib/createTestContext.js';
import {
	Migration,
	collection,
	createMigration,
	schema,
} from '@verdant-web/common';
import { ClientWithCollections } from '@verdant-web/store';
import {
	waitForEntitySnapshot,
	waitForPeerCount,
	waitForQueryResult,
} from './lib/waits.js';

const ctx = createTestContext({
	// testLog: true,
});

it('prunes invalid data in entities with changes from outdated clients', async () => {
	const v1Item = collection({
		name: 'item',
		primaryKey: 'id',
		fields: {
			id: { type: 'string' },
			contents: { type: 'string', nullable: true },
			tags: { type: 'array', items: { type: 'string' } },
			nested: {
				type: 'object',
				nullable: true,
				properties: {
					a: { type: 'object', properties: { b: { type: 'string' } } },
				},
			},
			yikes: { type: 'string', nullable: true },
			willHaveDefault: { type: 'number', nullable: true },
		},
	});
	const v1Schema = schema({
		version: 1,
		collections: {
			items: v1Item,
		},
	});

	let migrations: Migration<any>[] = [createMigration(v1Schema)];

	const clientAInit = {
		migrations,
		library: 'test',
		user: 'a',
	};

	const clientA = (await ctx.createTestClient({
		...clientAInit,
		schema: v1Schema,
	})) as any as ClientWithCollections;
	clientA.sync.start();

	const clientBInit = {
		migrations,
		library: 'test',
		user: 'b',
	};

	const clientB = (await ctx.createTestClient({
		...clientBInit,
		schema: v1Schema,
	})) as any as ClientWithCollections;

	const item1 = await clientA.items.put({
		id: '1',
		contents: 'hello',
		tags: ['a', 'b'],
	});

	clientB.sync.start();
	await waitForQueryResult(clientB.items.get('1'));

	// need to make a change here so B doesn't get its data
	// reset next sync... TODO: don't require this arbitrary thing.
	const item2B = await clientB.items.get('1').resolved;
	item2B.set('contents', 'world...');

	await clientB.close();

	await waitForPeerCount(clientA, 0);

	// add some changes which will be invalid in v2
	item1.get('tags').push('c');
	item1.set('nested', { a: { b: 'c' } });

	const v2Item = collection({
		name: 'item',
		primaryKey: 'id',
		fields: {
			id: { type: 'string' },
			contents: { type: 'string', nullable: true },
			tags: {
				type: 'array',
				items: { type: 'object', properties: { name: { type: 'string' } } },
			},
			nested: {
				type: 'object',
				nullable: true,
				properties: {
					a: { type: 'object', properties: { c: { type: 'string' } } },
				},
			},
			yikes: {
				type: 'object',
				properties: { value: { type: 'string' } },
			},
			willHaveDefault: { type: 'number', default: () => 42 },
		},
	});

	const v2Schema = schema({
		version: 2,
		collections: {
			items: v2Item,
		},
	});

	migrations = [
		createMigration(v1Schema),
		createMigration(v1Schema, v2Schema, async ({ migrate }) => {
			await migrate('items', ({ tags, nested, yikes, ...existing }) => {
				return {
					...existing,
					tags: tags.map((t: string) => ({ name: t })),
					nested: nested ? { a: { c: nested.a.b } } : null,
					yikes: yikes ? { value: yikes } : { value: 'default' },
				};
			});
		}),
	];

	const clientB2 = (await ctx.createTestClient({
		...clientBInit,
		schema: v2Schema,
		migrations,
	})) as any as ClientWithCollections;
	await clientB2.sync.start();

	// clientB2 will now migrate the item, but some data will sync
	// from A which isn't valid for the new schema. the entity
	// should prune that data to only show valid data

	await waitForPeerCount(clientA, 1);

	const getItem1 = clientB2.items.get('1');
	await waitForQueryResult(getItem1);

	await waitForEntitySnapshot(
		getItem1.current,
		{
			contents: 'world...',
			id: '1',
			// the invalid item is filtered out
			tags: [{ name: 'a' }, { name: 'b' }],
			// should be pruned to null here -
			// the sub-object is not nullable, and its contents
			// are invalid.
			nested: null,
			// should have received this during migration
			willHaveDefault: 42,
			yikes: { value: 'default' },
		},
		2000,
		(e) => {
			e;
		},
	);

	// A is still online and still can make old data
	ctx.log('Making a new item on A');
	const item2 = await clientA.items.put({
		id: '2',
		contents: 'hi',
		tags: ['a', 'b', 'c'],
		yikes: 'foo',
	});

	const getItem2 = clientB2.items.get('2');

	// item 2 is completely pruned (yikes is not nullable and has no default)
	ctx.log('waiting for item 2 to be pruned');
	await waitForQueryResult(getItem2, (v) => {
		return !v;
	});

	await clientA.close();
	ctx.log('Client A closed');

	// upgrade client A to v2 to resolve pruned data
	const clientA2 = (await ctx.createTestClient({
		...clientAInit,
		schema: v2Schema,
		migrations,
	})) as any as ClientWithCollections;

	await clientA2.sync.start();

	await waitForQueryResult(getItem1);
	await waitForEntitySnapshot(
		getItem1.current,
		{
			contents: 'world...',
			id: '1',
			// the previously invalid item is restored
			tags: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
			nested: { a: { c: 'c' } },
			willHaveDefault: 42,
			yikes: { value: 'default' },
		},
		2000,
		(e) => {
			e;
			// debugger;
		},
	);

	// this should now recover after A2 migrates
	await waitForQueryResult(getItem2);
	await waitForEntitySnapshot(getItem2.current, {
		contents: 'hi',
		id: '2',
		tags: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
		nested: null,
		willHaveDefault: 42,
		yikes: { value: 'foo' },
	});
});
