import { delay } from './utils.js';

type Post = {
	id: string;
	title: string;
	content: string;
};

const preloads = new Map<string, Promise<Post>>();
const preloaded = new Map<string, Post>();

export async function loadPost(id: string, debugSource: string) {
	console.log(`loadPost(${id}) from ${debugSource}`);
	if (preloaded.has(id)) {
		console.log(`already preloaded this post, bailing...`);
		return preloaded.get(id)!;
	}
	if (preloads.has(id)) {
		console.log(`already preloading this post, bailing...`);
		return preloads.get(id);
	}
	const preload = delay(2000).then(() => {
		preloads.delete(id);
		preloaded.set(id, {
			id,
			title: `Post ${id}`,
			content: `This is post ${id}.`,
		});
		return preloaded.get(id)!;
	});
	preloads.set(id, preload);
	return preload;
}

export function getPost(id: string) {
	return preloaded.get(id);
}
