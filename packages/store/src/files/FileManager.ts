import { FileData, FileRef } from '@verdant-web/common';
import { Context } from '../context.js';
import { Metadata } from '../metadata/Metadata.js';
import { Sync } from '../sync/Sync.js';
import {
	EntityFile,
	MARK_FAILED,
	MARK_UPLOADED,
	UPDATE,
} from './EntityFile.js';
import {
	FileStorage,
	ReturnedFileData,
	StoredFileData,
} from './FileStorage.js';

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

	private maxUploadRetries = 3;
	private maxDownloadRetries = 3;

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
		this.sync.subscribe('serverReset', this.storage.resetSyncedStatusSince);
		// check on startup to see if files can be cleaned up
		this.tryCleanupDeletedFiles();
	}

	add = async (file: FileData) => {
		// this method accepts a FileData which refers to a remote
		// file, as well as local files. in the case of a remote file,
		// we actually re-download and upload the file again. this powers
		// the cloning of documents with files; we clone their filedata
		// and re-upload to a new file ID. otherwise, when the cloned
		// filedata was marked deleted, the original file would be deleted
		// and the clone would refer to a missing file.
		if (file.url && !file.file) {
			const blob = await this.downloadRemoteFile(file.url);
			// convert blob to file with name and type
			file.file = new File([blob], file.name, { type: file.type });
		}

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
		if (file.file && this.sync.status === 'active') {
			await this.uploadFile(file);
		}
	};

	private uploadFile = async (file: FileData, retries = 0) => {
		const result = await this.sync.uploadFile(file);
		if (result.success) {
			await this.storage.markUploaded(file.id);
			const cached = this.files.get(file.id);
			if (cached) {
				cached[MARK_UPLOADED]();
			}
			this.context.log('info', 'File uploaded', file.id);
		} else {
			if (result.retry && retries < this.maxUploadRetries) {
				this.context.log(
					'error',
					`Error uploading file ${file.id}, retrying...`,
					result.error,
				);
				// schedule a retry
				setTimeout(this.uploadFile, 1000, file, retries + 1);
			} else {
				this.context.log(
					'error',
					`Failed to upload file ${file.id}. Not retrying until next sync.`,
					result.error,
				);
			}
		}
	};

	private downloadRemoteFile = async (
		url: string,
		retries = 0,
	): Promise<Blob> => {
		const resp = await fetch(url, {
			method: 'GET',
			credentials: 'include',
		});
		if (!resp.ok) {
			if (retries < this.maxDownloadRetries) {
				return new Promise((resolve, reject) => {
					setTimeout(() => {
						this.downloadRemoteFile(url, retries + 1).then(resolve, reject);
					}, 1000);
				});
			} else {
				throw new Error(`Failed to download file: ${resp.status}`);
			}
		}
		const blob = await resp.blob();
		return blob;
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
		if (retries > this.maxDownloadRetries) {
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

	exportAll = async (downloadRemote = false) => {
		const storedFiles = await this.storage.getAll();
		if (downloadRemote) {
			for (const storedFile of storedFiles) {
				// if it doesn't have a buffer, we need to read
				// one from the server
				if (!storedFile.file && storedFile.url) {
					try {
						const blob = await fetch(storedFile.url, {
							method: 'GET',
							credentials: 'include',
						}).then((r) => r.blob());
						storedFile.file = blob;
					} catch (err) {
						this.context.log(
							'error',
							"Failed to download file to cache it locally. The file will still be available using its URL. Check the file server's CORS configuration.",
							err,
						);
					}
				}
			}
		}
		return storedFiles;
	};

	importAll = async (files: ReturnedFileData[]) => {
		await Promise.all(files.map((file) => this.add(file)));
	};

	private onOnlineChange = async (online: boolean) => {
		// if online, try to upload any unsynced files
		if (online) {
			const unsynced = await this.listUnsynced();
			await Promise.all(unsynced.map(this.uploadFile));
		}
	};

	tryCleanupDeletedFiles = async () => {
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

	close = () => {
		this.storage.dispose();
	};

	stats = () => {
		return this.storage.stats();
	};
}
