import { describe, expect, it, vi } from 'vitest';
import { Entity } from './Entity.js';
import { EntityFamilyMetadata } from './EntityMetadata.js';
import { Context } from '../context.js';
import { EntityStoreEvents } from './EntityStore.js';
import { WeakEvent } from 'weak-event';
import { FileManager } from '../files/FileManager.js';
import {
	NaiveTimestampProvider,
	PatchCreator,
	createRef,
	groupPatchesByOid,
} from '@verdant-web/common';

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

	function createTestEntity() {
		const events: EntityStoreEvents = {
			add: new WeakEvent(),
			replace: new WeakEvent(),
			resetAll: new WeakEvent(),
		};
		const time = new NaiveTimestampProvider();
		const mockContext = {
			log: vi.fn(),
			getNow: () => time.now(1),
		} as any as Context;
		const patchCreator = new PatchCreator(() => time.now(1));
		const entity = new Entity({
			oid: 'test/1',
			schema,
			ctx: mockContext,
			events,
			metadataFamily: new EntityFamilyMetadata({
				ctx: mockContext,
				onPendingOperations: vi.fn(),
				rootOid: 'test/1',
			}),
			files: {
				add: vi.fn(),
				get: vi.fn(),
			} as any as FileManager,
			patchCreator,
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
});
