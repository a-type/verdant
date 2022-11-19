import * as fs from 'fs/promises';

export async function fileExists(path) {
	try {
		const result = await fs.stat(path);
		return !!result;
	} catch (err) {
		return false;
	}
}
