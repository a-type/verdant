import { FileInfo } from '../../files/FileStorage.js';
import { FileMetadata } from '../../types.js';
import { FileMetadataStorage } from '../Storage.js';
import { SqliteExecutor } from './database.js';
import { FileMetadataRow } from './tables.js';

export class SqlFileMetadata implements FileMetadataStorage {
	constructor(
		private db: SqliteExecutor,
		private libraryId: string,
		private deleteExpirationDays: number,
	) {}

	private attachLibrary = (row: FileMetadataRow) => {
		if (!row) return row;
		(row as any).libraryId = this.libraryId;
		return row as FileMetadata;
	};

	get = async (fileId: string): Promise<FileMetadata | null> => {
		const db = this.db;
		const row = await db.first<FileMetadataRow>(
			`SELECT * FROM FileMetadata WHERE fileId = ?`,
			[fileId],
		);
		if (row) return this.attachLibrary(row);
		return row;
	};

	getAll = async (): Promise<FileMetadata[]> => {
		const db = this.db;
		return (await db.query<FileMetadataRow>(`SELECT * FROM FileMetadata`)).map(
			this.attachLibrary,
		);
	};

	deleteAll = async (): Promise<void> => {
		const db = this.db;
		await db.exec('DELETE FROM FileMetadata');
	};

	put = async (fileInfo: FileInfo): Promise<void> => {
		const db = this.db;
		await db.exec(
			`INSERT INTO FileMetadata (fileId, name, type) VALUES (?, ?, ?)
				ON CONFLICT(fileId) DO UPDATE SET
					name = excluded.name,
					type = excluded.type,
					pendingDeleteAt = NULL
			`,
			[fileInfo.id, fileInfo.fileName, fileInfo.type],
		);
	};

	markPendingDelete = async (fileId: string): Promise<void> => {
		const db = this.db;
		await db.exec(
			`UPDATE FileMetadata SET pendingDeleteAt = ? WHERE fileId = ?`,
			[Date.now(), fileId],
		);
	};

	delete = async (fileId: string): Promise<void> => {
		const db = this.db;
		await db.exec(`DELETE FROM FileMetadata WHERE fileId = ?`, [fileId]);
	};

	getPendingDelete = async (): Promise<FileMetadata[]> => {
		const db = this.db;
		return (
			await db.query<FileMetadataRow>(
				`SELECT * FROM FileMetadata WHERE pendingDeleteAt < ?`,
				[Date.now() - this.deleteExpirationDays * 24 * 60 * 60 * 1000],
			)
		).map(this.attachLibrary);
	};
}
