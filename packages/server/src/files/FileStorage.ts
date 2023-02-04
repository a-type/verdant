import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

export interface FileInfo {
	fileName: string;
	id: string;
	libraryId: string;
	type: string;
}

/**
 * The interface for implementing a file storage backend.
 * lo-fi will supply file Blobs and metadata, and the storage backend
 * must store them somewhere.
 *
 * The storage backend must also provide a way to get a URL for the file,
 * even if the file is not yet uploaded, based on its metadata.
 */
export interface FileStorage {
	put(fileStream: Readable, data: FileInfo): Promise<void>;
	getUrl(data: FileInfo): string;
	delete(data: FileInfo): Promise<void>;
}

export class LocalFileStorage implements FileStorage {
	private readonly host: string;
	private readonly rootDirectory: string;

	constructor({
		rootDirectory,
		host,
	}: {
		rootDirectory: string;
		host: string;
	}) {
		this.host = this.prepareHost(host);
		this.rootDirectory = rootDirectory;
	}

	private prepareHost = (host: string) => {
		if (host.endsWith('/')) {
			return host.slice(0, -1);
		}
		return host;
	};

	async put(fileStream: Readable, data: FileInfo): Promise<void> {
		const filePath = this.getPath(data);
		const containingDirectory = path.dirname(
			path.join(this.rootDirectory, filePath),
		);
		await fs.promises.mkdir(containingDirectory, {
			recursive: true,
		});
		const dest = fs.createWriteStream(this.getStorageLocation(data));
		fileStream.pipe(dest);
	}

	getUrl(data: FileInfo): string {
		return `${this.host}/${this.getPath(data)}`;
	}

	async delete(data: FileInfo): Promise<void> {
		await fs.promises.unlink(this.getStorageLocation(data));

		const containingDirectory = path.dirname(
			path.join(this.rootDirectory, this.getPath(data)),
		);

		// delete the containing folder if it's empty
		try {
			await fs.promises.rmdir(containingDirectory);
		} catch (e) {
			// ignore
		}
	}

	private getPath(data: FileInfo): string {
		// retain the file extension
		return `${data.libraryId}/${data.id}/${data.fileName}`;
	}

	private getStorageLocation(data: FileInfo): string {
		return path.join(this.rootDirectory, this.getPath(data));
	}
}
