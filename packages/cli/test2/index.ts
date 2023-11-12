import { ClientDescriptor } from './.generated/index';

const client = await new ClientDescriptor({
	migrations: [],
	namespace: 'test2',
}).open();

const todo = await client.todos.put({
	id: '1',
	content: 'test',
	done: false,
});

todo.get('tags').get(0);
