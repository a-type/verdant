import { Database } from 'better-sqlite3';
import { FileInfo } from './FileStorage.js';

export class FileMetadata {
	constructor(private db: Database) {}

	get = (
		libraryId: string,
		fileId: string,
	): {
		libraryId: string;
		fileId: string;
		name: string;
		type: string;
	} => {
		return this.db
			.prepare(
				`
      SELECT * FROM FileMetadata
      WHERE libraryId = ? AND fileId = ?
    `,
			)
			.get(libraryId, fileId);
	};

	put = (libraryId: string, fileInfo: FileInfo) => {
		return this.db
			.prepare(
				`
      INSERT OR REPLACE INTO FileMetadata (libraryId, fileId, name, type)
      VALUES (?, ?, ?, ?)
    `,
			)
			.run(libraryId, fileInfo.id, fileInfo.fileName, fileInfo.type);
	};

	delete = (libraryId: string, fileId: string) => {
		return this.db
			.prepare(
				`
      DELETE FROM FileMetadata
      WHERE libraryId = ? AND fileId = ?
    `,
			)
			.run(libraryId, fileId);
	};
}
