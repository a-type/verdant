import { FilesystemImplementation } from './interfaces.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class NodeFilesystem implements FilesystemImplementation {
	writeFile = async (filePath: string, data: Blob) => {
		const directory = path.dirname(filePath);
		try {
			await fs.mkdir(directory, { recursive: true });
		} catch (err) {
			if (err instanceof Error && 'code' in err && err.code === 'EEXIST') {
				// nbd.
			} else {
				throw err;
			}
		}
		// it's... not always a real Blob... because vitest/jsdom...
		if ('stream' in data) {
			const stream = data.stream();
			await fs.writeFile(filePath, stream);
		} else {
			const buffer = await readJsdomFile(data);
			await fs.writeFile(filePath, buffer);
		}
	};
	copyDirectory = async (options: { from: string; to: string }) => {
		const { from, to } = options;

		const copyRecursive = async (src: string, dest: string) => {
			try {
				const entries = await fs.readdir(src, { withFileTypes: true });
				await fs.mkdir(dest, { recursive: true });

				for (const entry of entries) {
					const srcPath = path.join(src, entry.name);
					const destPath = path.join(dest, entry.name);

					if (entry.isDirectory()) {
						await copyRecursive(srcPath, destPath);
					} else {
						await fs.copyFile(srcPath, destPath);
					}
				}
			} catch (err) {
				if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
					// nbd.
					return;
				}
				throw err;
			}
		};

		await copyRecursive(from, to);
	};
	copyFile = async (options: { from: string; to: string }) => {
		const { from, to } = options;
		await fs.copyFile(from, to);
	};
	deleteFile = async (path: string) => {
		await fs.unlink(path);
	};
	readDirectory = async (path: string) => {
		return await fs.readdir(path);
	};
	readFile = async (path: string) => {
		const buffer = await fs.readFile(path);
		// TODO: validate this cast...
		return new Blob([buffer as any]);
	};
}

const readJsdomFile = async (file: Buffer): Promise<NodeJS.ArrayBufferView> => {
	const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
		// @ts-ignore
		const reader = new FileReader();
		reader.onload = function () {
			return resolve(reader.result as ArrayBuffer);
		};
		reader.onerror = function () {
			return reject(reader.error);
		};
		reader.readAsArrayBuffer(file);
	});
	return new Uint8Array(arrayBuffer);
};
