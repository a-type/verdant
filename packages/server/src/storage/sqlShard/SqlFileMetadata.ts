import { Kysely } from 'kysely';
import { FileMetadataStorage } from '../Storage.js';
import { Database, FileMetadataRow } from './tables.js';
import { FileMetadata } from '../../types.js';
import { FileInfo } from '../../files/FileStorage.js';
import { Databases } from './Databases.js';

export class SqlFileMetadata implements FileMetadataStorage {
	constructor(
		private dbs: Databases,
		private deleteExpirationDays: number,
		private dialect: 'postgres' | 'sqlite',
	) {}

	private attachLibrary = (libraryId: string, row: FileMetadataRow) => {
		if (!row) return row;
		(row as any).libraryId = libraryId;
		return row as FileMetadata;
	};

	get = async (
		libraryId: string,
		fileId: string,
	): Promise<FileMetadata | null> => {
		const db = await this.dbs.get(libraryId);
		const row =
			(await db
				.selectFrom('FileMetadata')
				.where('fileId', '=', fileId)
				.selectAll()
				.executeTakeFirst()) ?? null;
		if (row) return this.attachLibrary(libraryId, row);
		return row;
	};

	getAll = async (libraryId: string): Promise<FileMetadata[]> => {
		const db = await this.dbs.get(libraryId);
		return (await db.selectFrom('FileMetadata').selectAll().execute()).map(
			this.attachLibrary.bind(this, libraryId),
		);
	};

	deleteAll = async (libraryId: string): Promise<void> => {
		const db = await this.dbs.get(libraryId);
		await db.deleteFrom('FileMetadata').execute();
	};

	put = async (libraryId: string, fileInfo: FileInfo): Promise<void> => {
		const db = await this.dbs.get(libraryId);
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

	markPendingDelete = async (
		libraryId: string,
		fileId: string,
	): Promise<void> => {
		const db = await this.dbs.get(libraryId);
		await db
			.updateTable('FileMetadata')
			.set({ pendingDeleteAt: Date.now() })
			.where('fileId', '=', fileId)
			.execute();
	};

	delete = async (libraryId: string, fileId: string): Promise<void> => {
		const db = await this.dbs.get(libraryId);
		await db.deleteFrom('FileMetadata').where('fileId', '=', fileId).execute();
	};

	getPendingDelete = async (libraryId: string): Promise<FileMetadata[]> => {
		const db = await this.dbs.get(libraryId);
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
		).map(this.attachLibrary.bind(this, libraryId));
	};
}
