import { FileData, FileRef } from '@verdant-web/common';
import { Context } from '../context.js';
import { Metadata } from '../metadata/Metadata.js';
import { Sync } from '../sync/Sync.js';
import { EntityFile, MARK_FAILED, UPDATE } from './EntityFile.js';
import { FileStorage, ReturnedFileData } from './FileStorage.js';

/**
 * Default: if file was deleted > 3 days ago
 */
function defaultCanCleanup(fileData: ReturnedFileData) {
	return (
		fileData.deletedAt !== null &&
		fileData.deletedAt < Date.now() - 1000 * 60 * 24 * 3
	);
}

export interface FileManagerConfig {
	/**
	 * Override the heuristic for deciding when a deleted file can be cleaned up.
	 * By default this waits 3 days since deletion, then deletes the file data.
	 * If the file has been synchronized to a server, it could still be restored
	 * if the server has not yet deleted it.
	 */
	canCleanupDeletedFile?: (file: ReturnedFileData) => boolean;
}

export class FileManager {
	private storage;
	private sync;
	private context;

	private files = new Map<string, EntityFile>();
	private config: Required<FileManagerConfig>;
	private meta: Metadata;

	constructor({
		db,
		sync,
		context,
		meta,
		config = {},
	}: {
		db: IDBDatabase;
		sync: Sync;
		context: Context;
		config?: FileManagerConfig;
		meta: Metadata;
	}) {
		this.storage = new FileStorage(db);
		this.sync = sync;
		this.context = context;
		this.meta = meta;
		this.config = {
			canCleanupDeletedFile: defaultCanCleanup,
			...config,
		};

		this.sync.subscribe('onlineChange', this.onOnlineChange);
		this.meta.subscribe('filesDeleted', this.handleFileRefsDeleted);
		// check on startup to see if files can be cleaned up
		this.tryCleanupDeletedFiles();
	}

	add = async (fileInput: Omit<FileData, 'remote'>) => {
		const file = fileInput as unknown as FileData;
		file.remote = false;
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
			const result = await this.sync.uploadFile(file);
			if (result.success) {
				await this.storage.markUploaded(file.id);
			} else {
				this.context.log('error', 'Failed to upload file');
			}
		}
	};

	private uploadFile = async (file: FileData, retries = 0) => {
		const result = await this.sync.uploadFile(file);
		if (result.success) {
			await this.storage.markUploaded(file.id);
		} else {
			if (result.retry && retries < 5) {
				this.context.log('error', 'Error uploading file, retrying...');
				// schedule a retry
				setTimeout(this.uploadFile, 1000, file, retries + 1);
			} else {
				this.context.log(
					'error',
					'Failed to upload file. Not retrying until next sync.',
				);
			}
		}
	};

	/**
	 * Immediately returns an EntityFile to use, then either loads
	 * the file from cache, local database, or the server.
	 */
	get = (id: string, options?: { downloadRemote?: boolean }) => {
		if (this.files.has(id)) {
			return this.files.get(id)!;
		}
		const file = new EntityFile(id, options);
		this.files.set(id, file);
		this.load(file);
		return file;
	};

	private load = async (file: EntityFile, retries = 0) => {
		if (retries > 5) {
			this.context.log('error', 'Failed to load file after 5 retries');
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
					await this.storage.addFile(result.data, {
						downloadRemote: file.downloadRemote,
					});
				} else {
					this.context.log('error', 'Failed to load file', result);
					file[MARK_FAILED]();
					if (result.retry) {
						// schedule a retry
						setTimeout(this.load, 1000, file, retries + 1);
					}
				}
			} catch (err) {
				this.context.log('error', 'Failed to load file', err);
				file[MARK_FAILED]();
				// schedule a retry
				setTimeout(this.load, 1000, file, retries + 1);
			}
		}
	};

	listUnsynced = async () => {
		return this.storage.listUnsynced();
	};

	private onOnlineChange = async (online: boolean) => {
		// if online, try to upload any unsynced files
		if (online) {
			const unsynced = await this.listUnsynced();
			await Promise.all(unsynced.map(this.uploadFile));
		}
	};

	private tryCleanupDeletedFiles = async () => {
		let count = 0;
		let skipCount = 0;
		await this.storage.iterateOverPendingDelete((fileData, store) => {
			if (this.config.canCleanupDeletedFile(fileData)) {
				count++;
				store.delete(fileData.id);
			} else {
				skipCount++;
			}
		});

		this.context.log(
			'info',
			`Cleaned up ${count} files, skipped ${skipCount} files`,
		);
	};

	private handleFileRefsDeleted = async (fileRefs: FileRef[]) => {
		const tx = this.storage.createTransaction(['files'], { mode: 'readwrite' });
		await Promise.all(
			fileRefs.map(async (fileRef) => {
				try {
					await this.storage.markPendingDelete(fileRef.id, { transaction: tx });
				} catch (err) {
					this.context.log('error', 'Failed to mark file for deletion', err);
				}
			}),
		);
		this.context.log(
			'info',
			`Marked ${fileRefs.length} files as pending delete`,
		);
	};
}
