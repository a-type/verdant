import { Kysely } from 'kysely';
import { FileMetadataStorage } from '../Storage.js';
import { Database } from './tables.js';
import { FileMetadata } from '../../types.js';
import { FileInfo } from '../../files/FileStorage.js';

export class SqlFileMetadata implements FileMetadataStorage {
	constructor(
		private db: Kysely<Database>,
		private deleteExpirationDays: number,
		private dialect: 'postgres' | 'sqlite',
	) {}

	get = async (
		libraryId: string,
		fileId: string,
	): Promise<FileMetadata | null> => {
		return (
			(await this.db
				.selectFrom('FileMetadata')
				.where('libraryId', '=', libraryId)
				.where('fileId', '=', fileId)
				.selectAll()
				.executeTakeFirst()) ?? null
		);
	};

	getAll = async (libraryId: string): Promise<FileMetadata[]> => {
		return this.db
			.selectFrom('FileMetadata')
			.where('libraryId', '=', libraryId)
			.selectAll()
			.execute();
	};

	deleteAll = async (libraryId: string): Promise<void> => {
		await this.db
			.deleteFrom('FileMetadata')
			.where('libraryId', '=', libraryId)
			.execute();
	};

	put = async (libraryId: string, fileInfo: FileInfo): Promise<void> => {
		await this.db
			.insertInto('FileMetadata')
			.values({
				libraryId,
				fileId: fileInfo.id,
				name: fileInfo.fileName,
				type: fileInfo.type,
			})
			.onConflict((cb) =>
				cb.columns(['libraryId', 'fileId']).doUpdateSet({
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
		await this.db
			.updateTable('FileMetadata')
			.set({ pendingDeleteAt: Date.now() })
			.where('libraryId', '=', libraryId)
			.where('fileId', '=', fileId)
			.execute();
	};

	delete = async (libraryId: string, fileId: string): Promise<void> => {
		await this.db
			.deleteFrom('FileMetadata')
			.where('libraryId', '=', libraryId)
			.where('fileId', '=', fileId)
			.execute();
	};

	getPendingDelete = async (libraryId: string): Promise<FileMetadata[]> => {
		return this.db
			.selectFrom('FileMetadata')
			.where('libraryId', '=', libraryId)
			.where(
				'pendingDeleteAt',
				'<',
				Date.now() - 1000 * 60 * 60 * 24 * this.deleteExpirationDays,
			)
			.selectAll()
			.execute();
	};
}
