import { ClientDescriptor } from './.generated/index.js';
import migrations from './migrations/index.js';
import { describe, it, expect } from 'vitest';
import { createHooks } from './.generated/react.js';

function makeClient() {
	const desc = new ClientDescriptor({
		namespace: 'test',
		migrations,
		indexedDb: new IDBFactory(),
	});

	return desc.open();
}

describe('generated client', () => {
	it('should expose model accessors which produce usable models', async () => {
		const client = await makeClient();

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
});
