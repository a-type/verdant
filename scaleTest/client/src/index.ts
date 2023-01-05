import cuid from 'cuid';
import { createClient, Client } from './store/index.js';

/**
 * The scenario is collaborating on a To Do list.
 * Clients will randomly create items, update them, move them around, complete them, and
 * delete completed items.
 */

async function createItem(client: Client) {
	await client.items.put({
		name: `Item ${cuid.slug()}`,
	});
	console.log('Created item');
}

async function completeRandomItem(client: Client) {
	const items = await client.items.findAll({
		where: 'doneIndex',
		equals: false,
	}).resolved;
	const item = items[Math.floor(Math.random() * items.length)];
	if (item) {
		item.set('done', true);
	}
	console.log('Completed random item');
}

async function updateRandomItem(client: Client) {
	const items = await client.items.findAll({
		where: 'doneIndex',
		equals: false,
	}).resolved;
	const item = items[Math.floor(Math.random() * items.length)];
	if (item) {
		item.set('name', `Item ${cuid.slug()}`);
	}
	console.log('Updated random item');
}

async function deleteAllDone(client: Client) {
	const items = await client.items.findAll({
		where: 'doneIndex',
		equals: true,
	}).resolved;
	await client.items.deleteAll(items.map((i) => i.get('id')));
	console.log('Deleted all done items');
}

async function moveRandomItem(client: Client) {
	const items = await client.items.findAll({
		where: 'doneIndex',
		equals: false,
	}).resolved;
	const item = items[Math.floor(Math.random() * items.length)];
	if (item) {
		const categories = await client.categories.findAll().resolved;
		if (categories.length === 0) return;

		const category = categories[Math.floor(Math.random() * categories.length)];
		item.set('categoryId', category.get('id'));
	}
	console.log('Moved random item');
}

async function createCategory(client: Client) {
	await client.categories.put({
		name: `Category ${cuid.slug()}`,
	});
	console.log('Created category');
}

const actions = [
	createItem,
	completeRandomItem,
	updateRandomItem,
	deleteAllDone,
	moveRandomItem,
	createCategory,
] as const;

async function run(apiHost: string, library: string) {
	const client = await createClient(apiHost, library);

	client.sync.subscribe('onlineChange', (online) => {
		if (!online) {
			(window as any).onClientDisconnect?.();
		}
	});

	while (true) {
		const action = actions[Math.floor(Math.random() * actions.length)];
		await action(client);
		// add some delay - this is meant to simulate real users
		await new Promise((resolve) =>
			setTimeout(resolve, Math.random() * 1000 + 200),
		);
	}
}

const search = window.location.search;
const params = new URLSearchParams(search);
const library = params.get('library') || 'default';
const apiHost = params.get('api_host') || 'http://localhost:3000';

run(apiHost, library);
