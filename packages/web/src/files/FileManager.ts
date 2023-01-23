import { FileData } from '@lo-fi/common';
import { Sync } from '../sync/Sync.js';
import { LogFunction } from '../types.js';
import { EntityFile, MARK_FAILED, UPDATE } from './EntityFile.js';
import { FileStorage } from './FileStorage.js';

export class FileManager {
	private storage;
	private sync;
	private log;

	private files = new Map<string, EntityFile>();

	constructor({
		db,
		sync,
		log,
	}: {
		db: IDBDatabase;
		sync: Sync;
		log?: LogFunction;
	}) {
		this.storage = new FileStorage(db);
		this.sync = sync;
		this.log = log;
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
		// send to sync
		if (file.file) {
			const result = await this.sync.uploadFile(file.file, file);
			if (result.success) {
				await this.storage.markUploaded(file.id);
			} else {
				this.log?.('error', 'Failed to upload file');
			}
		}
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

	private load = async (file: EntityFile, retries = 0) => {
		if (retries > 5) {
			file[MARK_FAILED]();
			return;
		}

		const fileData = await this.storage.getFile(file.id);
		if (fileData) {
			file[UPDATE](fileData);
		} else {
			// maybe we don't have it yet, it might be on the server still.
			try {
				const result = await this.sync.getFile(file.id);
				if (result.success) {
					file[UPDATE](result.data);
					await this.storage.addFile(result.data);
				} else {
					file[MARK_FAILED]();
					if (result.retry) {
						// schedule a retry
						setTimeout(this.load, 1000, file, retries + 1);
					}
				}
			} catch (err) {
				this.log?.('error', 'Failed to load file', err);
				file[MARK_FAILED]();
				// schedule a retry
				setTimeout(this.load, 1000, file, retries + 1);
			}
		}
	};
}
