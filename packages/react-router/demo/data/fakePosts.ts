import { delay } from './utils.js';

type Post = {
	id: string;
	title: string;
	content: string;
};

const preloaded = new Map<string, Post>();

export async function loadPost(id: string) {
	if (!preloaded.has(id)) {
		await delay(2000);
		preloaded.set(id, {
			id,
			title: `Post ${id}`,
			content: `This is post ${id}`,
		});
	}
}

export function getPost(id: string) {
	return preloaded.get(id);
}
