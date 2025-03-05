import { Kysely } from 'kysely';
import { FileInfo } from '../../files/FileStorage.js';
import { FileMetadata } from '../../types.js';
import { FileMetadataStorage } from '../Storage.js';
import { Database, FileMetadataRow } from './tables.js';

export class SqlFileMetadata implements FileMetadataStorage {
	constructor(
		private db: Kysely<Database>,
		private libraryId: string,
		private deleteExpirationDays: number,
		private dialect: 'postgres' | 'sqlite',
	) {}

	private attachLibrary = (row: FileMetadataRow) => {
		if (!row) return row;
		(row as any).libraryId = this.libraryId;
		return row as FileMetadata;
	};

	get = async (fileId: string): Promise<FileMetadata | null> => {
		const db = this.db;
		const row =
			(await db
				.selectFrom('FileMetadata')
				.where('fileId', '=', fileId)
				.selectAll()
				.executeTakeFirst()) ?? null;
		if (row) return this.attachLibrary(row);
		return row;
	};

	getAll = async (): Promise<FileMetadata[]> => {
		const db = this.db;
		return (await db.selectFrom('FileMetadata').selectAll().execute()).map(
			this.attachLibrary,
		);
	};

	deleteAll = async (): Promise<void> => {
		const db = this.db;
		await db.deleteFrom('FileMetadata').execute();
	};

	put = async (fileInfo: FileInfo): Promise<void> => {
		const db = this.db;
		await db
			.insertInto('FileMetadata')
			.values({
				fileId: fileInfo.id,
				name: fileInfo.fileName,
				type: fileInfo.type,
			})
			.onConflict((cb) =>
				cb.column('fileId').doUpdateSet({
					name: fileInfo.fileName,
					type: fileInfo.type,
					pendingDeleteAt: null,
				}),
			)
			.execute();
	};

	markPendingDelete = async (fileId: string): Promise<void> => {
		const db = this.db;
		await db
			.updateTable('FileMetadata')
			.set({ pendingDeleteAt: Date.now() })
			.where('fileId', '=', fileId)
			.execute();
	};

	delete = async (fileId: string): Promise<void> => {
		const db = this.db;
		await db.deleteFrom('FileMetadata').where('fileId', '=', fileId).execute();
	};

	getPendingDelete = async (): Promise<FileMetadata[]> => {
		const db = this.db;
		return (
			await db
				.selectFrom('FileMetadata')
				.where(
					'pendingDeleteAt',
					'<',
					Date.now() - 1000 * 60 * 60 * 24 * this.deleteExpirationDays,
				)
				.selectAll()
				.execute()
		).map(this.attachLibrary);
	};
}
