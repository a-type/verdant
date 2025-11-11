import {
	NaiveTimestampProvider,
	PatchCreator,
	groupPatchesByOid,
} from '@verdant-web/common';
import { describe, expect, it, vi } from 'vitest';
import { WeakEvent } from 'weak-event';
import { Context } from '../context/context.js';
import { Time } from '../context/Time.js';
import { FileManager } from '../files/FileManager.js';
import { Entity } from './Entity.js';
import { EntityFamilyMetadata } from './EntityMetadata.js';
import { EntityStoreEvents } from './EntityStore.js';

describe('Entity', () => {
	const schema = {
		type: 'object',
		properties: {
			id: { type: 'string', default: () => 'hi' },
			string: { type: 'string' },
			number: { type: 'number', default: () => 1 },
			nullable: {
				type: 'object',
				nullable: true,
				properties: {
					first: { type: 'object', properties: { inner: { type: 'string' } } },
					second: { type: 'string', default: 'foo' },
				},
			},
			nonNullable: {
				type: 'object',
				properties: {
					first: { type: 'object', properties: { inner: { type: 'string' } } },
				},
			},
			map: {
				type: 'map',
				values: {
					type: 'string',
				},
			},
			list: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						inner: { type: 'string' },
					},
				},
			},
		},
	} as const;

	function createTestEntity({
		onPendingOperations = vi.fn(),
	}: { onPendingOperations?: () => void } = {}) {
		const events: EntityStoreEvents = {
			add: new WeakEvent(),
			replace: new WeakEvent(),
			resetAll: new WeakEvent(),
		};
		const time = new NaiveTimestampProvider();
		const patchCreator = new PatchCreator(() => time.now(1));
		const mockContext: Partial<Context> = {
			log: vi.fn(),
			time: new Time(time, 1),
			patchCreator,
			weakRef: (v: any) => new WeakRef(v),
		};
		const entity = new Entity({
			oid: 'test/1',
			schema,
			ctx: mockContext as Context,
			storeEvents: events,
			metadataFamily: new EntityFamilyMetadata({
				ctx: mockContext as Context,
				onPendingOperations,
				rootOid: 'test/1',
			}),
			files: {
				add: vi.fn(),
				get: vi.fn(),
			} as any as FileManager,
			readonlyKeys: ['id'],
			deleteSelf: vi.fn(),
		});

		function initialize(data: any) {
			const rawOps = patchCreator.createInitialize(data, 'test/1');
			const operations = groupPatchesByOid(rawOps);
			events.replace.invoke(null as any, {
				oid: 'test/1',
				operations,
				isLocal: false,
			});
		}

		return { entity, initialize };
	}

	describe('pruning behaviors', () => {
		it('prunes missing non-nullable fields up to the nearest nullable object', () => {
			const { entity, initialize } = createTestEntity();

			initialize({
				id: 'hi',
				string: 'world',
				number: 1,
				nullable: {
					// invalid child
					first: { wrong: 'bar' },
				},
				nonNullable: {
					first: { inner: 'foo' },
				},
				map: {},
				list: [],
			});

			expect(entity.getSnapshot()).toEqual({
				id: 'hi',
				string: 'world',
				number: 1,
				nullable: null,
				nonNullable: {
					first: { inner: 'foo' },
				},
				map: {},
				list: [],
			});
		});

		it('prunes the whole doc if no prune point is available', () => {
			const { entity, initialize } = createTestEntity();

			initialize({
				id: 'hi',
				string: 'world',
				number: 1,
				nullable: null,
				nonNullable: {
					first: { wrong: 'foo' },
				},
				map: {},
				list: [],
			});

			expect(entity.getSnapshot()).toEqual(null);
		});

		it('prunes invalid list items', () => {
			const { entity, initialize } = createTestEntity();

			initialize({
				id: 'hi',
				string: 'world',
				number: 1,
				nullable: null,
				nonNullable: { first: { inner: 'foo' } },
				map: {},
				list: [20, { inner: 'yay' }],
			});

			expect(entity.getSnapshot()).toEqual({
				id: 'hi',
				string: 'world',
				number: 1,
				nullable: null,
				nonNullable: { first: { inner: 'foo' } },
				map: {},
				list: [{ inner: 'yay' }],
			});
		});

		it('prunes invalid map items', () => {
			const { entity, initialize } = createTestEntity();

			initialize({
				id: 'hi',
				string: 'world',
				number: 1,
				nullable: null,
				nonNullable: { first: { inner: 'foo' } },
				map: { a: 1, b: 'yay' },
				list: [],
			});

			expect(entity.getSnapshot()).toEqual({
				id: 'hi',
				string: 'world',
				number: 1,
				nullable: null,
				nonNullable: { first: { inner: 'foo' } },
				map: { b: 'yay' },
				list: [],
			});
		});

		it('doesnt prune when defaults exist', () => {
			const { entity, initialize } = createTestEntity();

			initialize({
				id: 'hi',
				string: 'world',
				nullable: null,
				nonNullable: { first: { inner: 'foo' } },
				map: {},
				list: [],
			});

			expect(entity.getSnapshot()).toEqual({
				id: 'hi',
				string: 'world',
				number: 1,
				nullable: null,
				nonNullable: { first: { inner: 'foo' } },
				map: {},
				list: [],
			});
		});
	});

	describe('changes', () => {
		it('can apply partial updates including undefineds', () => {
			const { entity, initialize } = createTestEntity();

			initialize({
				id: 'hi',
				string: 'world',
				number: 1,
				nullable: null,
				nonNullable: { first: { inner: 'foo' } },
				map: {},
				list: [20, { inner: 'yay' }],
			});

			entity.update({
				string: 'new world',
				number: undefined,
			});

			expect(entity.get('string')).toBe('new world');
		});
	});

	describe('dropping pending operations', () => {
		it('drops the correct operation', () => {
			const onPendingOperations = vi.fn();
			const { entity, initialize } = createTestEntity({ onPendingOperations });

			initialize({
				id: 'hi',
				string: 'world',
				number: 1,
				nullable: null,
				nonNullable: { first: { inner: 'foo' } },
				map: {},
				list: [],
			});

			entity.update({ string: 'new world' });
			expect(onPendingOperations).toHaveBeenCalledTimes(1);
			const operation = onPendingOperations.mock.calls[0][0][0];

			entity.__discardPendingOperation__(operation);

			expect(entity.get('string')).toBe('world');
		});
	});
});
