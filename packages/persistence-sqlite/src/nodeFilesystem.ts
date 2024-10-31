import { FilesystemImplementation } from './interfaces.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class NodeFilesystem implements FilesystemImplementation {
	writeFile = async (path: string, data: Blob) => {
		// it's... not always a real Blob... because vitest/jsdom...
		if ('stream' in data) {
			const stream = data.stream();
			await fs.writeFile(path, stream);
		} else {
			console.error('data is not a Blob; cannot write to disk...');
		}
	};
	copyDirectory = async (options: { from: string; to: string }) => {
		const { from, to } = options;

		const copyRecursive = async (src: string, dest: string) => {
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
		};

		await copyRecursive(from, to);
	};
	deleteFile = async (path: string) => {
		await fs.unlink(path);
	};
	readDirectory = async (path: string) => {
		return await fs.readdir(path);
	};
}

const readJsdomFile = async (file: Buffer) => {
	return new Promise<ArrayBuffer>((resolve, reject) => {
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
};
