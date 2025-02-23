import { describe, expect, it, vi } from 'vitest';
import { createMigration } from './migration.js';
import { schema } from './schema/index.js';

describe('migration', () => {
	it('can migrate schemas with recursive fields', async () => {
		const recursiveFieldBase = schema.fields.object({
			fields: {},
		});
		const recursiveField = schema.fields.replaceObjectFields(
			recursiveFieldBase,
			{
				nested: recursiveFieldBase,
			},
		);
		const fromSchema = schema({
			version: 1,
			collections: {
				things: schema.collection({
					name: 'thing',
					primaryKey: 'id',
					fields: {
						id: schema.fields.id(),
						recursive: recursiveField,
					},
				}),
			},
		});
		const toSchema = schema({
			version: 2,
			collections: {
				things: schema.collection({
					name: 'thing',
					primaryKey: 'id',
					fields: {
						id: schema.fields.id(),
						recursive: recursiveField,
						newField: schema.fields.number(),
					},
				}),
			},
		});

		const procedure = vi.fn(() => Promise.resolve());
		const migration = createMigration(fromSchema, toSchema, procedure);

		await migration.migrate({
			log: () => {},
			queries: {},
			mutations: {},
			migrate: () => Promise.resolve(),
			deleteCollection: () => Promise.resolve(),
		});

		expect(procedure).toHaveBeenCalledOnce();
	});

	it('auto-migrates new default fields without complaining', async () => {
		const fromSchema = schema({
			version: 1,
			collections: {
				things: schema.collection({
					name: 'thing',
					primaryKey: 'id',
					fields: {
						id: schema.fields.id(),
					},
				}),
			},
		});
		const toSchema = schema({
			version: 2,
			collections: {
				things: schema.collection({
					name: 'thing',
					primaryKey: 'id',
					fields: {
						id: schema.fields.id(),
						newField: schema.fields.number({
							default: 1,
						}),
						newNullable: schema.fields.object({
							fields: {
								foo: schema.fields.string(),
							},
							nullable: true,
						}),
					},
				}),
			},
		});

		const procedure = vi.fn(() => Promise.resolve());
		const migration = createMigration(fromSchema, toSchema, procedure);

		const log = vi.fn();
		await migration.migrate({
			log,
			queries: {},
			mutations: {},
			migrate: () => Promise.resolve(),
			deleteCollection: () => Promise.resolve(),
		});

		expect(procedure).toHaveBeenCalledOnce();
		expect(log).not.toHaveBeenCalledWith(
			'error',
			'Unmigrated changed collections from version 1 to version 2:',
			['things'],
		);
	});
});
