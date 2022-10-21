import {
	ClientDescriptor,
	createDefaultMigration,
	WebsocketSync,
} from './.generated';
import schema from './schema.js';
import { describe, it, expect } from 'vitest';
import { createHooks } from './.generated/react';

function makeClient() {
	const desc = new ClientDescriptor({
		namespace: 'test',
		initialPresence: {},
		migrations: [createDefaultMigration(schema)],
		schema,
		sync: new WebsocketSync({
			host: 'fake',
		}),
	});

	return desc.open();
}

describe('generated client', () => {
	it('should expose model accessors which produce usable models', async () => {
		const client = await makeClient();

		const item = await client.todo.create({
			id: '1',
			attachments: [],
			category: null,
			content: 'test',
			done: false,
			tags: [],
		});

		expect(item.get('content')).toBe('test');

		const query = client.todo.findAll({
			where: 'example',
			gt: 'a',
			lt: 'x',
		});
		const result = await query.resolved;
		expect(result[0].get('id')).toBe('1');
	});
});

describe('generated react hooks', () => {
	it('should create all the hooks for each collection', async () => {
		const client = await makeClient();

		const hooks = createHooks(client);

		expect(hooks.useTodo).toBeDefined();
		expect(hooks.useAllTodos).toBeDefined();
		expect(hooks.useOneTodo).toBeDefined();
	});
});
