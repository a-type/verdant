import { readdir } from 'fs/promises';

export async function isEmpty(dir: string) {
	const files = await readdir(dir);
	return files.length === 0;
}
