import { Database } from 'better-sqlite3';
import { FileInfo } from './FileStorage.js';

export interface FileMetadataConfig {
	deleteExpirationDays?: number;
}

export class FileMetadata {
	private deleteExpirationDays = 1;

	constructor(
		private db: Database,
		{ deleteExpirationDays = 1 }: FileMetadataConfig = {},
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

	getAll = (libraryId: string) => {
		return this.db
			.prepare(
				`
			SELECT * FROM FileMetadata
			WHERE libraryId = ?
		`,
			)
			.all(libraryId);
	};

	deleteAll = (libraryId: string) => {
		return this.db
			.prepare(
				`
			DELETE FROM FileMetadata
			WHERE libraryId = ?
		`,
			)
			.run(libraryId);
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

	getPendingDeletes = (libraryId: string) => {
		return this.db
			.prepare(
				`
					SELECT * FROM FileMetadata
					WHERE libraryId = ? AND pendingDeleteAt < ?
				`,
			)
			.all(
				libraryId,
				Date.now() - 1000 * 60 * 60 * 24 * this.deleteExpirationDays,
			) as {
			libraryId: string;
			fileId: string;
			name: string;
			type: string;
			pendingDeleteAt: number;
		}[];
	};
}
