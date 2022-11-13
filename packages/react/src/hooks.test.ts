import {
	collection,
	schema,
	StorageDescriptor,
	WebsocketSync,
} from '@lo-fi/web';
import { describe, it, expect } from 'vitest';
import { createHooks } from './hooks.js';

describe('generated hooks', () => {
	it('should create singular and plural hooks for all collections', () => {
		const author = collection({
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
		const tally = collection({
			name: 'tally',
			pluralName: 'tallies',
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
				author,
				tally,
			},
		});

		const hooks = createHooks(testSchema);

		expect(hooks).toHaveProperty('useAuthor');
		expect(hooks).toHaveProperty('useAllAuthors');
		expect(hooks).toHaveProperty('useTally');
		expect(hooks).toHaveProperty('useAllTallies');
	});
});
