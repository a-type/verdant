import { FileData } from '@verdant-web/common';
import {
	AbstractTransaction,
	PersistedFileData,
	PersistenceFileDb,
	QueryMode,
} from '../../interfaces.js';
import { IdbService } from '../IdbService.js';
import { getAllFromObjectStores, getSizeOfObjectStore } from '../util.js';

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
	transaction = (opts: {
		mode?: QueryMode;
		storeNames: string[];
		abort?: AbortSignal;
	}): AbstractTransaction => {
		return this.createTransaction(opts.storeNames, {
			mode: opts.mode,
			abort: opts.abort,
		});
	};

	add = async (
		file: FileData,
		options?: { transaction?: AbstractTransaction; downloadRemote?: boolean },
	): Promise<void> => {
		let buffer = file.file ? await fileToArrayBuffer(file.file) : undefined;
		if (!buffer && options?.downloadRemote && file.url) {
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
				} satisfies StoredFileData);
			},
			{
				mode: 'readwrite',
				transaction: options?.transaction as IDBTransaction,
			},
		);
	};
	markUploaded = async (
		id: string,
		options?: { transaction?: AbstractTransaction },
	): Promise<void> => {
		const current = await this.getFileRaw(id, options);

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
				transaction: options?.transaction as IDBTransaction,
			},
		);
	};
	get = async (
		fileId: string,
		options?: { transaction?: AbstractTransaction },
	): Promise<PersistedFileData | null> => {
		const raw = await this.getFileRaw(fileId, options);
		if (!raw) {
			return null;
		}
		return this.hydrateFileData(raw);
	};
	delete = (
		fileId: string,
		options?: { transaction?: AbstractTransaction },
	): Promise<void> => {
		return this.run<undefined>(
			'files',
			(store) => {
				return store.delete(fileId);
			},
			{
				mode: 'readwrite',
				transaction: options?.transaction as IDBTransaction,
			},
		);
	};
	markPendingDelete = async (
		fileId: string,
		options?: { transaction?: AbstractTransaction },
	): Promise<void> => {
		const current = await this.getFileRaw(fileId, options);

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
				transaction: options?.transaction as IDBTransaction,
			},
		);
	};
	listUnsynced = async (options?: {
		transaction?: AbstractTransaction;
	}): Promise<PersistedFileData[]> => {
		const raw = await this.run<StoredFileData[]>(
			'files',
			(store) => {
				return store.index('remote').getAll('false');
			},
			{ mode: 'readonly', transaction: options?.transaction as IDBTransaction },
		);
		return raw.map(this.hydrateFileData);
	};
	resetSyncedStatusSince = async (
		since: string | null,
		options?: { transaction?: AbstractTransaction },
	): Promise<void> => {
		const tx: IDBTransaction =
			(options?.transaction as any) ??
			this.createTransaction(['files'], { mode: 'readwrite' });
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
		options?: { transaction?: IDBTransaction },
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
				transaction: options?.transaction as IDBTransaction,
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
