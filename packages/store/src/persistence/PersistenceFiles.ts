import { FileData, FileRef } from '@verdant-web/common';
import { Context, FileConfig } from '../context/context.js';
import { PersistedFileData, PersistenceFileDb } from './interfaces.js';
import { Disposable } from '../utils/Disposable.js';

export class PersistenceFiles extends Disposable {
	constructor(
		private db: PersistenceFileDb,
		private context: Omit<Context, 'queries'>,
	) {
		super();
		context.internalEvents.subscribe('filesDeleted', this.onFileRefsDeleted);
		this.compose(this.db);
		// on startup, try deleting old files.
		this.cleanupDeletedFiles();
	}

	private get config(): Required<FileConfig> {
		return {
			canCleanupDeletedFile(fileData) {
				return (
					fileData.deletedAt !== null &&
					fileData.deletedAt < Date.now() - 1000 * 60 * 24 * 3
				);
			},
			...this.context.config.files,
		};
	}

	onServerReset = (since: string | null) =>
		this.db.resetSyncedStatusSince(since);
	add = async (file: FileData, options?: { downloadRemote?: boolean }) => {
		// this method accepts a FileData which refers to a remote
		// file, as well as local files. in the case of a remote file,
		// we actually re-download and upload the file again. this powers
		// the cloning of documents with files; we clone their filedata
		// and re-upload to a new file ID. otherwise, when the cloned
		// filedata was marked deleted, the original file would be deleted
		// and the clone would refer to a missing file.
		if (file.url && !file.file) {
			this.context.log(
				'debug',
				'Remote file added to an entity. This usually means an entity was cloned. Downloading remote file...',
				file.id,
			);
			const blob = await this.context.files.downloadRemoteFile(file.url, 0, 3);
			// convert blob to file with name and type
			file.file = new File([blob], file.name, { type: file.type });
		}

		file.remote = false;
		// fire event for processing immediately
		this.context.internalEvents.emit('fileAdded', file);
		// store in persistence db
		await this.db.add(file, options);
		this.context.log('debug', 'File added', file.id);
	};
	onUploaded = this.db.markUploaded.bind(this.db);
	get = this.db.get.bind(this.db);
	getAll = this.db.getAll.bind(this.db);
	listUnsynced = this.db.listUnsynced.bind(this.db);
	iterateOverPendingDelete = this.db.iterateOverPendingDelete.bind(this.db);
	stats = this.db.stats.bind(this.db);

	private getFileExportName = (originalFileName: string, id: string) => {
		return `${id}___${originalFileName}`;
	};
	export = async (downloadRemote = false) => {
		const storedFiles = await this.getAll();
		if (downloadRemote) {
			for (const storedFile of storedFiles) {
				// if it doesn't have a buffer, we need to read one from the server
				if (!storedFile.file && storedFile.url) {
					try {
						const blob = await this.downloadRemoteFile(storedFile.url);
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
		// split files into data and files
		const fileData: Array<Omit<PersistedFileData, 'file'>> = [];
		const files: Array<File> = [];

		for (const fileExport of storedFiles) {
			const file = fileExport.file;
			delete fileExport.file;
			fileData.push(fileExport);
			if (file) {
				// rename with ID
				const asFile = new File(
					[file],
					this.getFileExportName(fileExport.name, fileExport.id),
					{
						type: fileExport.type,
					},
				);
				files.push(asFile);
			} else {
				this.context.log(
					'warn',
					`File ${fileExport.id} was could not be loaded locally or from the server. It will be missing in the export.`,
				);
			}
		}
		return {
			fileData,
			files,
		};
	};

	import = async ({
		fileData,
		files,
	}: {
		fileData: Array<Omit<PersistedFileData, 'file'>>;
		files: File[];
	}) => {
		// re-attach files to their file data and import
		const fileToIdMap = new Map(
			files.map((file) => {
				const { id } = this.parseFileExportname(file.name);
				return [id, file];
			}),
		);
		const importedFiles: PersistedFileData[] = fileData.map((fileData) => {
			const file = fileToIdMap.get(fileData.id);

			return {
				...fileData,
				file,
			};
		});
		await Promise.all(importedFiles.map((file) => this.add(file)));
	};

	private parseFileExportname = (name: string) => {
		const [id, originalFileName] = name.split('___');
		return { id, originalFileName };
	};

	downloadRemoteFile = async (url: string, retries = 0, maxRetries = 0) => {
		const resp = await fetch(url, {
			method: 'GET',
			credentials: 'include',
		});
		if (!resp.ok) {
			if (retries < maxRetries) {
				return new Promise<Blob>((resolve, reject) => {
					setTimeout(() => {
						this.downloadRemoteFile(url, retries + 1, maxRetries).then(
							resolve,
							reject,
						);
					}, 1000);
				});
			} else {
				throw new Error(
					`Failed to download file after ${maxRetries} retries (status: ${resp.status})`,
				);
			}
		}
		return await resp.blob();
	};

	cleanupDeletedFiles = async () => {
		let count = 0;
		let skipCount = 0;
		await this.iterateOverPendingDelete((fileData, store) => {
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

	private onFileRefsDeleted = async (fileRefs: FileRef[]) => {
		const tx = this.db.transaction({
			mode: 'readwrite',
			storeNames: ['files'],
		});
		await Promise.all(
			fileRefs.map(async (fileRef) => {
				try {
					await this.db.markPendingDelete(fileRef.id, { transaction: tx });
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
