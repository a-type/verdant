import {
	ClientDescriptor,
	createDefaultMigration,
} from './.generated/index.js';
import schema from './schema.js';
import { describe, it, expect } from 'vitest';
import { hooks } from './.generated/react.js';

function makeClient() {
	const desc = new ClientDescriptor({
		namespace: 'test',
		migrations: [createDefaultMigration(schema)],
	});

	return desc.open();
}

describe('generated client', () => {
	it('should expose model accessors which produce usable models', async () => {
		const client = await makeClient();

		const item = await client.todos.create({
			attachments: [],
			category: null,
			content: 'test',
		});

		expect(item.get('content')).toBe('test');

		const query = client.todos.findAll({
			where: 'example',
			gt: 'a',
			lt: 'x',
		});
		const result = await query.resolved;
		expect(result[0].get('id')).toBeDefined();
		expect(result[0].get('content')).toBe('test');

		item.get('attachments').push({
			name: 'new',
		});

		expect(item.get('attachments').getSnapshot()).toEqual([
			{ name: 'new', test: 1 },
		]);
	});
});

describe('generated react hooks', () => {
	it('should create all the hooks for each collection', async () => {
		expect(hooks.useTodo).toBeDefined();
		expect(hooks.useAllTodos).toBeDefined();
		expect(hooks.useOneTodo).toBeDefined();
	});
});
