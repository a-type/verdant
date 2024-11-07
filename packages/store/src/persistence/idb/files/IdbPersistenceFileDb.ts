import { FileData } from '@verdant-web/common';
import {
	AbstractTransaction,
	PersistedFileData,
	PersistenceFileDb,
} from '../../interfaces.js';
import { IdbService } from '../IdbService.js';
import { getAllFromObjectStores, getSizeOfObjectStore } from '../util.js';
import { Context } from '../../../internal.js';

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

export class IdbPersistenceFileDb
	extends IdbService
	implements PersistenceFileDb
{
	add = async (
		file: FileData,
	): Promise<void> => {
		let buffer = file.file ? await fileToArrayBuffer(file.file) : undefined;

		await this.run(
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
					timestamp: file.timestamp,
				} satisfies StoredFileData);
			},
			{
				mode: 'readwrite',
			},
		);
	};
	markUploaded = async (id: string): Promise<void> => {
		const current = await this.getFileRaw(id);

		if (!current) {
			throw new Error('File is not in local database');
		}

		await this.run(
			'files',
			(store) => {
				return store.put({
					...current,
					remote: 'true',
				} as StoredFileData);
			},
			{
				mode: 'readwrite',
			},
		);
	};
	get = async (fileId: string): Promise<PersistedFileData | null> => {
		const raw = await this.getFileRaw(fileId);
		if (!raw) {
			return null;
		}
		return this.hydrateFileData(raw);
	};
	delete = (fileId: string): Promise<void> => {
		return this.run<undefined>(
			'files',
			(store) => {
				return store.delete(fileId);
			},
			{
				mode: 'readwrite',
			},
		);
	};
	markPendingDelete = async (fileId: string): Promise<void> => {
		const current = await this.getFileRaw(fileId);

		if (!current) {
			throw new Error('File is not in local database');
		}

		await this.run(
			'files',
			(store) => {
				return store.put({
					...current,
					deletedAt: Date.now(),
				} as StoredFileData);
			},
			{
				mode: 'readwrite',
			},
		);
	};
	listUnsynced = async (): Promise<PersistedFileData[]> => {
		const raw = await this.run<StoredFileData[]>(
			'files',
			(store) => {
				return store.index('remote').getAll('false');
			},
			{ mode: 'readonly' },
		);
		return raw.map(this.hydrateFileData);
	};
	resetSyncedStatusSince = async (since: string | null): Promise<void> => {
		const tx: IDBTransaction = this.createTransaction(['files'], {
			mode: 'readwrite',
		});
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
		iterator: (file: PersistedFileData, store: IDBObjectStore) => void,
	): Promise<void> => {
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
			{
				mode: 'readwrite',
			},
		);
	};
	getAll = async (options?: {
		transaction?: AbstractTransaction;
	}): Promise<PersistedFileData[]> => {
		const [files] = await getAllFromObjectStores(this.db, ['files']);
		return files.map(this.hydrateFileData);
	};
	stats = async (): Promise<{ size: { count: number; size: number } }> => {
		return {
			size: await getSizeOfObjectStore(this.db, 'files'),
		};
	};
	loadFileContents = async (file: FileData, ctx: Context): Promise<Blob> => {
		if (file.file) return file.file;
		if (file.localPath) {
			throw new Error('Local file paths are not supported in browser');
		}
		if (file.url) {
			const response = await ctx.environment.fetch(file.url);
			if (!response.ok) {
				throw new Error(`Failed to download file: ${response.statusText}`);
			}
			return response.blob();
		}
		throw new Error('File is missing url, file, and localPath');
	}

	private hydrateFileData = (raw: StoredFileData): PersistedFileData => {
		(raw as any).remote = raw.remote === 'true';
		const buffer = raw.buffer;
		delete raw.buffer;
		(raw as unknown as FileData).file = buffer
			? arrayBufferToBlob(buffer, raw.type)
			: undefined;
		return raw as unknown as PersistedFileData;
	};

	private getFileRaw = async (
		id: string,
		{ transaction }: { transaction?: AbstractTransaction } = {},
	): Promise<StoredFileData | undefined> => {
		const raw = await this.run<StoredFileData>(
			'files',
			(store) => {
				return store.get(id);
			},
			{ mode: 'readonly', transaction: transaction as IDBTransaction },
		);
		if (!raw) {
			return undefined;
		}
		return raw;
	};
}

export function arrayBufferToBlob(buffer: ArrayBuffer, type: string) {
	return new Blob([buffer], { type });
}

function fileToArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
	// special case for testing...
	if ('__testReadBuffer' in file) {
		return Promise.resolve<any>(file.__testReadBuffer);
	}
	return new Promise<ArrayBuffer>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			resolve(reader.result as ArrayBuffer);
		};
		reader.onerror = reject;
		reader.readAsArrayBuffer(file);
	});
}
