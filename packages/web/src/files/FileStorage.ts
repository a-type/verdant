import { FileData, fileToArrayBuffer } from '@lo-fi/common';
import { IDBService } from '../IDBService.js';

/**
 * When stored in IDB, replace the file blob with an array buffer
 * since it's more compatible, and replace remote boolean with
 * a string since IDB doesn't support boolean indexes.
 */
interface StoredFileData extends Omit<FileData, 'remote' | 'file'> {
	remote: 'true' | 'false';
	buffer?: ArrayBuffer;
	deletedAt: number | null;
}

export interface ReturnedFileData extends FileData {
	deletedAt: number | null;
}

export class FileStorage extends IDBService {
	addFile = async (
		file: FileData,
		{ transaction }: { transaction?: IDBTransaction } = {},
	) => {
		const buffer = file.file ? await fileToArrayBuffer(file.file) : undefined;
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
				} satisfies StoredFileData);
			},
			'readwrite',
			transaction,
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
				} satisfies StoredFileData);
			},
			'readwrite',
			transaction,
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
			'readonly',
			transaction,
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
			'readwrite',
			transaction,
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
				} satisfies StoredFileData);
			},
			'readwrite',
			transaction,
		);
	};

	listUnsynced = async () => {
		const raw = await this.run<StoredFileData[]>(
			'files',
			(store) => {
				return store.index('remote').getAll('false');
			},
			'readonly',
		);
		return raw.map(this.hydrateFileData);
	};

	iterateOverPendingDelete = (iterator: (file: ReturnedFileData, store: IDBObjectStore) => void, transaction?: IDBTransaction) => {
		return this.iterate<StoredFileData>(
			'files',
			(store) => {
				return store.index('deletedAt').openCursor(
					IDBKeyRange.lowerBound(0, true),
				);
			},
			(value, store) => {
				iterator(this.hydrateFileData(value), store)
			},
			'readwrite',
			transaction
		)
	};
}

export function arrayBufferToBlob(buffer: ArrayBuffer, type: string) {
	return new Blob([buffer], { type });
}
