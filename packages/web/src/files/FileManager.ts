import { FileData } from '@lo-fi/common';
import { EntityFile, UPDATE } from './EntityFile.js';
import { FileStorage } from './FileStorage.js';

export class FileManager {
	private storage;

	private files = new Map<string, EntityFile>();

	constructor({ db }: { db: IDBDatabase }) {
		this.storage = new FileStorage(db);
	}

	add = async (file: FileData) => {
		// immediately cache the file
		if (!this.files.has(file.id)) {
			const entityFile = new EntityFile(file.id);
			entityFile[UPDATE](file);
			this.files.set(file.id, entityFile);
		} else {
			this.files.get(file.id)![UPDATE](file);
		}
		// write to local storage and send to sync immediately
		await this.storage.addFile(file);
		// TODO: send to sync
	};

	/**
	 * Immediately returns an EntityFile to use, then either loads
	 * the file from cache, local database, or the server.
	 */
	get = (id: string) => {
		if (this.files.has(id)) {
			return this.files.get(id)!;
		}
		const file = new EntityFile(id);
		this.files.set(id, file);
		this.load(file);
		return file;
	};

	private load = async (file: EntityFile) => {
		const fileData = await this.storage.getFile(file.id);
		if (fileData) {
			file[UPDATE](fileData);
		} else {
			// maybe we don't have it yet, it might be on the server still.
			// TODO: fetch from server
		}
	};
}
