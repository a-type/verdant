import {
	createMigration,
	schema,
	StorageMapFieldSchema,
	StorageObjectFieldSchema,
	StorageStringFieldSchema,
} from '@verdant-web/common';
import { describe, expect, it } from 'vitest';
import { Client } from '../client/Client.js';
import { ClientWithCollections } from '../index.js';
import { IdbPersistence } from '../persistence/idb/idbPersistence.js';

describe('schema', () => {
	it('supports recursive nested fields without breaking', async () => {
		type NestedField = StorageObjectFieldSchema<{
			foo: StorageStringFieldSchema;
			bar: StorageMapFieldSchema<NestedField>;
		}>;
		const baseField = schema.fields.object({
			fields: {
				foo: schema.fields.string(),
			},
		});
		const nestedField: NestedField = schema.fields.replaceObjectFields(
			baseField,
			{
				foo: schema.fields.string(),
				bar: schema.fields.map({
					values: baseField,
				}),
			},
		);

		const tests = schema.collection({
			name: 'tests',
			primaryKey: 'id',
			fields: {
				id: schema.fields.string(),
				nested: nestedField,
			},
			indexes: {
				testLevel3: {
					type: 'string',
					compute: (doc) => doc.nested.bar?.baz?.bar?.baz?.foo ?? '',
				},
			},
		});

		const testSchema = schema({
			version: 1,
			collections: {
				tests,
			},
		});

		const storage: ClientWithCollections = new Client({
			schema: testSchema,
			migrations: [createMigration<{}>(testSchema)],
			namespace: 'schematest',
			oldSchemas: [testSchema],
			persistence: new IdbPersistence(new IDBFactory()),
		}) as any;

		const doc = await storage.tests.put({
			id: 'test',
			nested: {
				foo: 'foo',
				bar: {
					baz: {
						foo: 'bar',
						bar: {
							baz: {
								foo: 'bar',
							},
						},
					},
				},
			},
		});

		expect(
			doc.get('nested').get('bar').get('baz').get('bar').get('baz').get('foo'),
		).toBe('bar');
	});
});
