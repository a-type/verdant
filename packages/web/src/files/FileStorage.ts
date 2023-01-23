import {
	arrayBufferToBlob,
	FileData,
	fileToArrayBuffer,
	StoredFileData,
} from '@lo-fi/common';
import { IDBService } from '../IDBService.js';

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
					remote: file.remote,
					name: file.name,
					type: file.type,
					url: file.url,
					buffer,
				});
			},
			'readwrite',
			transaction,
		);
	};

	markUploaded = async (
		id: string,
		{ transaction }: { transaction?: IDBTransaction } = {},
	) => {
		const current = await this.getFile(id, { transaction });

		if (!current) {
			throw new Error('File is not in local database');
		}

		return this.run(
			'files',
			(store) => {
				return store.put({
					...current,
					remote: true,
				});
			},
			'readwrite',
			transaction,
		);
	};

	getFile = async (
		id: string,
		{ transaction }: { transaction?: IDBTransaction } = {},
	): Promise<FileData | undefined> => {
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
		const buffer = raw.buffer;
		delete raw.buffer;
		(raw as unknown as FileData).file = buffer
			? arrayBufferToBlob(buffer, raw.type)
			: undefined;
		return raw as unknown as FileData;
	};

	removeFile(
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
}
