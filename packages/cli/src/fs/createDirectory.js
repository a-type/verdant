import * as fs from 'fs/promises';

export async function createDirectory(path) {
	try {
		await fs.mkdir(path, { recursive: true });
	} catch (e) {
		console.error(e);
	}
}
