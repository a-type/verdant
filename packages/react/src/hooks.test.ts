import { collection, schema } from '@verdant-web/store';
import { describe, it, expect } from 'vitest';
import { createHooks } from './hooks.js';

describe('generated hooks', () => {
	it('should create singular and plural hooks for all collections', () => {
		const authors = collection({
			name: 'author',
			primaryKey: 'id',
			fields: {
				id: {
					type: 'string',
					indexed: true,
				},
				name: {
					type: 'string',
				},
			},
			compounds: {},
			synthetics: {},
		});
		const tallies = collection({
			name: 'tally',
			primaryKey: 'id',
			fields: {
				id: {
					type: 'string',
					indexed: true,
				},
				count: {
					type: 'number',
				},
			},
			compounds: {},
			synthetics: {},
		});
		const testSchema = schema({
			version: 1,
			collections: {
				authors,
				tallies,
			},
		});

		const hooks = createHooks(testSchema);

		expect(hooks).toHaveProperty('useAuthor');
		expect(hooks).toHaveProperty('useAllAuthors');
		expect(hooks).toHaveProperty('useTally');
		expect(hooks).toHaveProperty('useAllTallies');
	});
});
