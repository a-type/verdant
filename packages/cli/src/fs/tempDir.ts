import * as fs from 'fs/promises';
import * as fsSync from 'fs';

export async function tempDir(base: string, cleanup = true) {
	const dir = await fs.mkdtemp(base);
	if (cleanup) {
		process.on('exit', () => {
			fsSync.rmdirSync(dir, { recursive: true });
		});
	}
	return dir;
}
