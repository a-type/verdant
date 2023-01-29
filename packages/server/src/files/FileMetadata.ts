import { Database } from 'better-sqlite3';
import { FileInfo } from './FileStorage.js';

export class FileMetadata {
	private deleteExpirationDays = 1;

	constructor(
		private db: Database,
		{ deleteExpirationDays = 1 }: { deleteExpirationDays?: number } = {},
	) {
		this.deleteExpirationDays = deleteExpirationDays;
	}

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

	markPendingDelete = (libraryId: string, fileId: string) => {
		return this.db
			.prepare(
				`
					UPDATE FileMetadata
					SET pendingDeleteAt = ?
					WHERE libraryId = ? AND fileId = ?
				`,
			)
			.run(Date.now(), libraryId, fileId);
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

	cleanupPendingDeletes = (libraryId: string) => {
		// Delete files that have been marked for deletion for more than 1 day
		return this.db
			.prepare(
				`
					DELETE FROM FileMetadata
					WHERE libraryId = ? AND pendingDeleteAt < ?
				`,
			)
			.run(
				libraryId,
				Date.now() - 1000 * 60 * 60 * 24 * this.deleteExpirationDays,
			);
	};
}
