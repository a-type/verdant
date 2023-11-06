import * as fs from 'fs/promises';

/**
 * Recursively and destructively copy all files from one directory to another.
 */
export async function copy(from: string, to: string) {
	const fromStat = await fs.stat(from);
	if (fromStat.isDirectory()) {
		await fs.mkdir(to, { recursive: true });
		const files = await fs.readdir(from);
		for (const file of files) {
			await copy(`${from}/${file}`, `${to}/${file}`);
		}
	} else {
		await fs.copyFile(from, to);
	}
}
