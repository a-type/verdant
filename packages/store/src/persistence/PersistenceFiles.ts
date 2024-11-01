import { FileData, FileRef } from '@verdant-web/common';
import { Context, FileConfig } from '../context/context.js';
import { PersistedFileData, PersistenceFileDb } from './interfaces.js';

export class PersistenceFiles {
	constructor(
		private db: PersistenceFileDb,
		private context: Omit<Context, 'queries'>,
	) {
		context.internalEvents.subscribe('filesDeleted', this.onFileRefsDeleted);
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
	add = async (file: FileData) => {
		// this method accepts a FileData which refers to a remote
		// file, as well as local files. in the case of a remote file,
		// we actually re-download and upload the file again. this powers
		// the cloning of documents with files; we clone their filedata
		// and re-upload to a new file ID. otherwise, when the cloned
		// filedata was marked deleted, the original file would be deleted
		// and the clone would refer to a missing file.
		if (file.url && !(file.localPath || file.file)) {
			this.context.log(
				'debug',
				'Remote file added to an entity. This usually means an entity was cloned. Downloading remote file...',
				file.id,
			);
			const blob = await this.loadFileContents(file, 0, 3);
			// convert blob to file with name and type
			file.file = new File([blob], file.name, { type: file.type });
			// remove the URL - it points to the original file's uploaded server version,
			// but this file is a clone
			delete file.url;
			this.context.log(
				'debug',
				'Downloaded remote file',
				file.id,
				file.name,
				'. Cleared its remote URL.',
			);
		} else if (!file.url && !file.file && !file.localPath) {
			this.context.log(
				'warn',
				'File added without a file or URL. This file will not be available for use.',
				file.id,
			);
		}

		// always reset remote status to false, this is a new file just created
		// and must be uploaded, even if it is cloned from an uploaded file.
		file.remote = false;

		// fire event for processing immediately
		this.context.internalEvents.emit('fileAdded', file);
		// store in persistence db
		await this.db.add(file);
		this.context.globalEvents.emit('fileSaved', file);
		this.context.log(
			'debug',
			'File added',
			file.id,
			file.name,
			file.type,
			file.file
				? 'with binary file'
				: file.url
				? 'with url'
				: file.localPath
				? 'with local path'
				: 'with no data',
		);
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
	export = async (downloadRemote = true) => {
		const storedFiles = await this.getAll();
		if (downloadRemote) {
			for (const storedFile of storedFiles) {
				// if it doesn't have a buffer, we need to read one from the server
				if (!storedFile.file && (storedFile.url || storedFile.localPath)) {
					try {
						const blob = await this.loadFileContents(storedFile);
						storedFile.file = blob;
					} catch (err) {
						this.context.log(
							'error',
							"Failed to download file to cache it locally. The file will still be available using its URL. Check the file server's CORS configuration.",
							storedFile,
							err,
						);
					}
				} else if (!storedFile.file) {
					this.context.log(
						'warn',
						`File ${storedFile.id} has no file or URL. It will be missing in the export.`,
						storedFile,
					);
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

			if (!file) {
				this.context.log('warn', `File ${fileData.id} was not found in import`);
				return fileData;
			}

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

	private loadFileContents = async (
		file: FileData,
		retries = 0,
		maxRetries = 0,
	) => {
		try {
			return await this.db.loadFileContents(file, this.context);
		} catch (err) {
			if (retries < maxRetries) {
				return new Promise<Blob>((resolve, reject) => {
					setTimeout(() => {
						this.loadFileContents(file, retries + 1, maxRetries).then(
							resolve,
							reject,
						);
					}, 1000);
				});
			} else {
				throw new Error(`Failed to download file after ${maxRetries} retries`, {
					cause: err,
				});
			}
		}
	};

	cleanupDeletedFiles = async () => {
		let count = 0;
		let skipCount = 0;
		const deletable: string[] = [];
		await this.iterateOverPendingDelete((fileData) => {
			if (this.config.canCleanupDeletedFile(fileData)) {
				count++;
				deletable.push(fileData.id);
			} else {
				skipCount++;
			}
		});
		for (const id of deletable) {
			await this.db.delete(id);
		}

		this.context.log(
			'info',
			`Cleaned up ${count} files, skipped ${skipCount} files`,
		);
	};

	private onFileRefsDeleted = async (fileRefs: FileRef[]) => {
		await Promise.all(
			fileRefs.map(async (fileRef) => {
				try {
					await this.db.markPendingDelete(fileRef.id);
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
