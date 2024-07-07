import { FileData } from '@verdant-web/common';
import { IDBService } from '../IDBService.js';
import { fileToArrayBuffer } from './utils.js';
import { getAllFromObjectStores, getSizeOfObjectStore } from '../idb.js';

/**
 * When stored in IDB, replace the file blob with an array buffer
 * since it's more compatible, and replace remote boolean with
 * a string since IDB doesn't support boolean indexes.
 */
export interface StoredFileData extends Omit<FileData, 'remote' | 'file'> {
	remote: 'true' | 'false';
	buffer?: ArrayBuffer;
	deletedAt: number | null;
	timestamp?: string;
}

export interface ReturnedFileData extends FileData {
	deletedAt: number | null;
}

export class FileStorage extends IDBService {
	addFile = async (
		file: FileData,
		{
			transaction,
			downloadRemote = false,
		}: { transaction?: IDBTransaction; downloadRemote?: boolean } = {},
	) => {
		let buffer = file.file ? await fileToArrayBuffer(file.file) : undefined;
		if (!buffer && downloadRemote && file.url) {
			try {
				buffer = await fetch(file.url, {
					method: 'GET',
					credentials: 'include',
				}).then((r) => r.arrayBuffer());
			} catch (err) {
				console.error(
					"Failed to download file to cache it locally. The file will still be available using its URL. Check the file server's CORS configuration.",
					err,
				);
			}
		}
		return this.run(
			'files',
			(store) => {
				return store.put({
					id: file.id,
					// IDB doesn't support boolean indexes
					remote: file.remote ? 'true' : 'false',
					deletedAt: null,
					name: file.name,
					type: file.type,
					url: file.url,
					buffer,
				} as StoredFileData);
			},
			{ mode: 'readwrite', transaction },
		);
	};

	private hydrateFileData = (raw: StoredFileData): ReturnedFileData => {
		(raw as any).remote = raw.remote === 'true';
		const buffer = raw.buffer;
		delete raw.buffer;
		(raw as unknown as FileData).file = buffer
			? arrayBufferToBlob(buffer, raw.type)
			: undefined;
		return raw as unknown as ReturnedFileData;
	};

	markUploaded = async (
		id: string,
		{ transaction }: { transaction?: IDBTransaction } = {},
	) => {
		const current = await this.getFileRaw(id, { transaction });

		if (!current) {
			throw new Error('File is not in local database');
		}

		return this.run(
			'files',
			(store) => {
				return store.put({
					...current,
					remote: 'true',
				} as StoredFileData);
			},
			{ mode: 'readwrite', transaction },
		);
	};

	private getFileRaw = async (
		id: string,
		{ transaction }: { transaction?: IDBTransaction } = {},
	): Promise<StoredFileData | undefined> => {
		const raw = await this.run<StoredFileData>(
			'files',
			(store) => {
				return store.get(id);
			},
			{ mode: 'readonly', transaction },
		);
		if (!raw) {
			return undefined;
		}
		return raw;
	};

	getFile = async (
		id: string,
		{ transaction }: { transaction?: IDBTransaction } = {},
	): Promise<ReturnedFileData | undefined> => {
		const raw = await this.getFileRaw(id, { transaction });
		if (!raw) {
			return undefined;
		}
		return this.hydrateFileData(raw);
	};

	deleteFile(
		id: string,
		{ transaction }: { transaction?: IDBTransaction } = {},
	) {
		return this.run<undefined>(
			'files',
			(store) => {
				return store.delete(id);
			},
			{ mode: 'readwrite', transaction },
		);
	}

	markPendingDelete = async (
		id: string,
		{ transaction }: { transaction?: IDBTransaction } = {},
	) => {
		const current = await this.getFileRaw(id, { transaction });

		if (!current) {
			throw new Error('File is not in local database');
		}

		return this.run(
			'files',
			(store) => {
				return store.put({
					...current,
					deletedAt: Date.now(),
				} as StoredFileData);
			},
			{ mode: 'readwrite', transaction },
		);
	};

	listUnsynced = async () => {
		const raw = await this.run<StoredFileData[]>(
			'files',
			(store) => {
				return store.index('remote').getAll('false');
			},
			{ mode: 'readonly' },
		);
		return raw.map(this.hydrateFileData);
	};

	resetSyncedStatusSince = async (since: string | null) => {
		const tx = this.createTransaction(['files'], { mode: 'readwrite' });
		const raw = await this.run<StoredFileData[]>(
			'files',
			(store) => {
				return store.index('remote').getAll('true');
			},
			{ transaction: tx },
		);

		const filtered = raw.filter(
			(file) => !file.timestamp || !since || file.timestamp > since,
		);

		await Promise.all(
			filtered.map((file) => {
				return this.run(
					'files',
					(store) => {
						return store.put({
							...file,
							remote: 'false',
						} as StoredFileData);
					},
					{ transaction: tx },
				);
			}),
		);
	};

	iterateOverPendingDelete = (
		iterator: (file: ReturnedFileData, store: IDBObjectStore) => void,
		transaction?: IDBTransaction,
	) => {
		return this.iterate<StoredFileData>(
			'files',
			(store) => {
				return store
					.index('deletedAt')
					.openCursor(IDBKeyRange.lowerBound(0, true));
			},
			(value, store) => {
				iterator(this.hydrateFileData(value), store);
			},
			{ mode: 'readwrite', transaction },
		);
	};

	getAll = async () => {
		const [files] = await getAllFromObjectStores(this.db, ['files']);
		return files.map(this.hydrateFileData);
	};

	stats = async () => {
		return {
			size: await getSizeOfObjectStore(this.db, 'files'),
		};
	};
}

export function arrayBufferToBlob(buffer: ArrayBuffer, type: string) {
	return new Blob([buffer], { type });
}
