import { describe, expect, it } from 'vitest';
import {
	getFilterTypings,
	getInitTypings,
	getDestructuredTypings,
	getMigrationTypings,
} from './typings.js';

describe('generated typings', () => {
	describe('init typings', () => {
		it('handles optionals for defaults and nullables', () => {
			expect(
				getInitTypings({
					collection: {
						name: 'test',
						// typings for this function aren't generic so the
						// valid values can't be inferred.
						primaryKey: 'id' as unknown as never,
						fields: {
							id: {
								type: 'string',
								default() {
									return 'id';
								},
							},
							text: {
								type: 'string',
								nullable: true,
							},
							num: {
								type: 'number',
								default: 1,
							},
							required: {
								type: 'string',
							},
						},
					},
				}),
			).toMatchInlineSnapshot(`
				"export type TestInit = {id?: string, text?: string | null, num?: number, required: string};
				"
			`);
		});
	});

	describe('destructured typings', () => {
		it('makes map values optional', () => {
			expect(
				getDestructuredTypings({
					collection: {
						name: 'test',
						primaryKey: 'id',
						fields: {
							id: {
								type: 'string',
							},
							map: {
								type: 'map',
								values: {
									type: 'string',
								},
							},
						},
					},
				}),
			).toMatchInlineSnapshot(`
				"export type TestDestructured = {id: string, map: TestMap};

				export type TestMapDestructured = {[key: string]: TestMapValue | undefined};"
			`);
		});
	});

	describe('filter typings', () => {
		it('generates "never" for no indexes', () => {
			expect(
				getFilterTypings({
					collection: {
						name: 'test',
						primaryKey: 'id',
						fields: {
							id: { type: 'string' },
						},
					},
					name: 'Test',
				}),
			).toMatchInlineSnapshot(`
				"export type TestFilter = never;"
			`);
		});
	});

	describe('migration typings', () => {
		it('should generate types mapped to collection plurals', () => {
			expect(
				getMigrationTypings({
					schema: {
						version: 1,
						collections: {
							todos: {
								name: 'todo',
								primaryKey: 'id',
								fields: {
									id: { type: 'string' },
									text: { type: 'string' },
								},
							},
							lists: {
								name: 'list',
								primaryKey: 'id',
								fields: {
									id: { type: 'string' },
									name: { type: 'string' },
								},
							},
						},
					},
				}),
			).toMatchInlineSnapshot('"export type MigrationTypes = {todos: {init: TodoInit, snapshot: TodoSnapshot}, lists: {init: ListInit, snapshot: ListSnapshot}};"');
		});
	});
});
