import {
	ClientWithCollections,
	ClientDescriptor,
	collection,
	createMigration,
	schema,
} from '../src/index.js';

const todoCollection = collection({
	name: 'todo',
	primaryKey: 'id',
	fields: {
		id: {
			type: 'string',
			indexed: true,
			default: () => Math.random().toString(36).slice(2, 9),
		},
		content: {
			type: 'string',
			indexed: true,
		},
		done: {
			type: 'boolean',
			default: false,
		},
		tags: {
			type: 'array',
			items: {
				type: 'string',
			},
		},
		category: {
			type: 'string',
		},
		attachments: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
					},
					test: {
						type: 'number',
						default: 1,
					},
				},
			},
		},
	},
	synthetics: {
		example: {
			type: 'string',
			compute: (doc) => doc.content,
		},
	},
	compounds: {
		tagsSortedByDone: {
			of: ['tags', 'done'],
		},
		categorySortedByDone: {
			of: ['category', 'done'],
		},
	},
});

const testSchema = schema({
	version: 1,
	collections: {
		todos: todoCollection,
	},
});

function createClient() {
	const storage = new ClientDescriptor({
		schema: testSchema,
		migrations: [createMigration<{}>(testSchema)],
		namespace: 'test' + Math.random().toFixed(10).slice(2),
		EXPERIMENTAL_weakRefs: true,
	}).open();
	return storage as Promise<ClientWithCollections>;
}

async function run() {
	const client = await createClient();
	console.log('Namespace', client.namespace);

	// continuously monitor memory usage and keep track of
	// peak values
	let peakMemory = 0;
	const monitor = () => {
		peakMemory = (performance as any).memory.usedJSHeapSize;
	};
	setInterval(monitor, 100);

	// start a timer
	const start = performance.now();

	// create a bunch of todos while a query is running
	const todosQuery = client.todos.findAll();
	const todoCount = 100;

	function querySeesSomething(count: number) {
		let timeout: NodeJS.Timeout;
		return Promise.race([
			new Promise<void>((resolve) => {
				todosQuery.subscribe('change', (todos) => {
					if (todos.length === count) {
						resolve();
						if (timeout) {
							clearTimeout(timeout);
						}
					}
				});
			}),
			new Promise<void>((resolve, reject) => {
				timeout = setTimeout(() => {
					console.error(
						`Query has stalled at ${todosQuery.current.length} todos (expected: ${count})`,
					);
					client.close();
					reject();
				}, 30000);
			}),
		]);
	}

	const querySeesAll = querySeesSomething(todoCount);

	console.log('Starting to create todos');

	for (let i = 0; i < todoCount; i++) {
		client.todos.put({
			id: `todo-${i}`,
			content: `Todo ${i}`,
			done: false,
			tags: ['tag1', 'tag2'],
			category: 'category1',
			attachments: [{ name: 'attachment1' }],
		});
	}

	console.log('Done creating todos');

	await querySeesAll;

	console.log('Query has caught up');

	const querySeesDeletes = querySeesSomething(todoCount / 2);

	console.log('Starting to delete todos');

	for (let i = 0; i < todoCount / 2; i++) {
		client.todos.delete(`todo-${i}`);
		// console.log(`Deleted todo-${i}`);
	}

	console.log('Done deleting todos');

	await querySeesDeletes;

	console.log('Query has caught up');

	// add a bunch more
	const querySeesMore = querySeesSomething(todoCount);

	console.log('Starting to create more todos');

	for (let i = 0; i < todoCount / 2; i++) {
		client.todos.put({
			id: `todo-${todoCount + i}`,
			content: `Todo ${todoCount + i}`,
			done: false,
			tags: ['tag1', 'tag2'],
			category: 'category1',
			attachments: [{ name: 'attachment1' }],
		});
		// console.log(`Created todo ${todoCount + i}`);
	}

	console.log('Done creating more todos');

	await querySeesMore;

	console.log('Query has caught up');

	// stop the timer
	const end = performance.now();

	// log the results
	console.log(`Took ${end - start}ms`);

	// write to file [now].run.json
	const now = new Date().toISOString();
	const filename = `${now}.run.json`;

	// download a JSON file with the results
	const blob = new Blob([JSON.stringify({ time: end - start })], {
		type: 'application/json',
	});
	const url = URL.createObjectURL(blob);
	document.body.innerHTML = `
	<h1>Performance test results</h1>
	<p>Time: ${end - start}ms</p>
	<p>Download <a href="${url}" download="${filename}">${filename}</a></p>
	<pre id="result">${JSON.stringify({ time: end - start })}</pre>
	`;

	process.exit(0);
}
run();
