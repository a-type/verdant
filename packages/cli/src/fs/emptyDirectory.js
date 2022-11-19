import * as fs from 'fs/promises';
import * as path from 'path';

export async function emptyDirectory(dir, except = []) {
	const files = await fs.readdir(dir);
	await Promise.all(
		files.map((file) => {
			if (!except.includes(file)) {
				fs.unlink(path.resolve(dir, file));
			}
		}),
	);
}
