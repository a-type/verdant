import * as fs from 'fs/promises';
import * as fsSync from 'fs';

export async function tempDir(base: string, cleanup = true) {
	const dir = await fs.mkdtemp(base);
	if (cleanup) {
		process.on('exit', () => {
			try {
				fsSync.rmdirSync(dir, { recursive: true });
			} catch (err) {
				// ignore
			}
		});
	}
	return dir;
}
