import { Client } from './.generated/index';

const client = new Client({
	migrations: [],
	namespace: 'test2',
});

const todo = await client.todos.put({
	id: '1',
	content: 'test',
	done: false,
});

todo.get('tags').get(0);
