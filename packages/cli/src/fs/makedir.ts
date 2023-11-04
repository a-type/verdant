import * as fs from 'fs/promises';

export async function makeDir(path: string) {
	try {
		await fs.mkdir(path, { recursive: true });
	} catch (e) {
		if ((e as any).code !== 'EEXIST') {
			throw e;
		}
	}
}
