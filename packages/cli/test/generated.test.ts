import { ClientDescriptor } from './.generated/index.js';
import { describe, it, expect } from 'vitest';
import { createHooks } from './.generated/react.js';
import fs from 'fs/promises';
import path from 'path';

function makeClient() {
	const desc = new ClientDescriptor({
		namespace: 'test',
		indexedDb: new IDBFactory(),
		sync: {
			defaultProfile: { foo: 'bar' },
			initialPresence: { baz: 1 },
			authEndpoint: 'http://localhost:3000/auth',
			autoStart: false,
		},
	});

	return desc.open();
}

async function readFile(file: string) {
	return fs.readFile(path.join(__dirname, file), 'utf8');
}

describe('generated client', () => {
	it('should expose model accessors which produce usable models', async () => {
		const client = await makeClient();

		client.sync.presence.update({
			baz: 3,
		});
		client.sync.presence.update({
			// @ts-expect-error
			nonce: 3,
		});
		client.sync.presence.self.profile.foo;
		// @ts-expect-error
		client.sync.presence.self.profile.nonce;

		const item = await client.todos.put({
			attachments: [],
			category: null,
			content: 'test',
			done: false,
		});

		expect(item.get('content')).toBe('test');

		const query = client.todos.findAll({
			index: {
				where: 'example',
				gt: 'a',
				lt: 'x',
			},
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
	it('should produce consistent output code', async () => {
		expect(await readFile('.generated/client.js')).toMatchSnapshot();
		expect(await readFile('.generated/client.d.ts')).toMatchSnapshot();
		expect(await readFile('.generated/index.ts')).toMatchSnapshot();
		expect(await readFile('.generated/schemaVersions/v1.js')).toMatchSnapshot();
		expect(
			await readFile('.generated/schemaVersions/v1.d.ts'),
		).toMatchSnapshot();
		expect(await readFile('.generated/meta.json')).toMatchSnapshot();
	});
});

describe('generated react hooks', () => {
	it('should create all the hooks for each collection', async () => {
		const hooks = createHooks();
		expect(hooks.useTodo).toBeDefined();
		expect(hooks.useAllTodos).toBeDefined();
		expect(hooks.useOneTodo).toBeDefined();

		// for testing typings... uncomment.
		// can't actually run this as React doesn't exist here (yet?)

		// const client = await makeClient();

		// const item = await client.todos.put({
		// 	attachments: [],
		// 	category: null,
		// 	content: 'test',
		// 	done: false,
		// });

		// const { tags } = hooks.useWatch(item)

		// const definitelyArray = hooks.useAllTodos({
		// 	index: { where: 'content', equals: '' },
		// });
		// const maybeNull = hooks.useAllTodos({
		// 	index: { where: 'content', equals: '' },
		// 	skip: false,
		// });
		// const definitelyDefined = hooks.useTodo('test');
		// const maybeNull2 = hooks.useTodo('test', { skip: false });
		// const definitelyDefined2 = hooks.useOneTodo({
		// 	index: { where: 'content', equals: '' },
		// });
		// const maybeNull3 = hooks.useOneTodo({
		// 	index: { where: 'content', equals: '' },
		// 	skip: false,
		// });
	});

	it('should produce consistent output code', async () => {
		expect(await readFile('.generated/react.js')).toMatchSnapshot();
		expect(await readFile('.generated/react.d.ts')).toMatchSnapshot();
	});
});
