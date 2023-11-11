import * as fs from 'fs/promises';

/**
 * Recursively deletes everything in a directory.
 */
export async function rm(path: string) {
	await fs.rm(path, { recursive: true });
}

export async function rmIfExists(path: string) {
	try {
		await rm(path);
	} catch (e) {
		if ((e as any).code !== 'ENOENT') {
			throw e;
		}
	}
}
