import * as fs from 'fs/promises';

/**
 * Recursively deletes everything in a directory.
 */
export async function rm(path: string) {
	await fs.rm(path, { recursive: true });
}
