import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// empty .client-sqlite directory
const clientSqliteDir = path.join(dirname, '..', '.client-sqlite');
const files = await fs.readdir(clientSqliteDir);
for (const file of files) {
	if (file === '.gitkeep') continue;
	try {
		await fs.unlink(path.join(clientSqliteDir, file));
	} finally {
	}
}

// remove all .sqlite, .sqlite-shm, and .sqlite-wal files from root directory
const rootDir = path.join(dirname, '..');
const rootFiles = await fs.readdir(rootDir);
for (const file of rootFiles) {
	if (
		file.endsWith('.sqlite') ||
		file.endsWith('.sqlite-shm') ||
		file.endsWith('.sqlite-wal')
	) {
		try {
			await fs.unlink(path.join(rootDir, file));
		} finally {
		}
	}
}
