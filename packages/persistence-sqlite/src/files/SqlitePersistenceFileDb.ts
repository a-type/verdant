import {
	AbstractTransaction,
	PersistedFileData,
	PersistenceFileDb,
	FileData,
} from '@verdant-web/store';
import { SqliteService } from '../SqliteService.js';
import { Database, StoredFileInfo } from '../kysely.js';
import { FilesystemImplementation } from '../interfaces.js';
import { Context } from '@verdant-web/store/internal';

export class SqlitePersistenceFileDb
	extends SqliteService
	implements PersistenceFileDb
{
	private fs;
	private directory;
	constructor(
		{
			db,
			fs,
			directory,
		}: { db: Database; fs: FilesystemImplementation; directory: string },
		ctx: Pick<Context, 'namespace' | 'log'>,
	) {
		super(db);
		this.fs = fs;
		this.directory = directory;
	}
	dispose = (): void | Promise<void> => {
		// nothing to do here.
	};
	add = async (file: FileData): Promise<void> => {
		await this.db
			.insertInto('__verdant__fileInfo')
			.values({
				id: file.id,
				remote: file.remote ? 1 : 0,
				deletedAt: null,
				name: file.name,
				type: file.type,
				url: file.url,
				timestamp: file.timestamp,
			})
			.onConflict((c) =>
				c.column('id').doUpdateSet({
					deletedAt: null,
					name: file.name,
					type: file.type,
					url: file.url,
					remote: file.remote ? 1 : 0,
				}),
			)
			.execute();
		if (file.file) {
			await this.fs.writeFile(
				`${this.directory}/${file.id}/${file.name}`,
				file.file,
			);
		}
	};
	markUploaded = async (fileId: string): Promise<void> => {
		await this.db
			.updateTable('__verdant__fileInfo')
			.set({ remote: 1 })
			.where('id', '=', fileId)
			.execute();
	};
	/** MUTATES */
	private hydrate = (
		file: Omit<StoredFileInfo, 'timestamp'>,
	): PersistedFileData => {
		(file as any).remote = file.remote !== 0;
		return file as any;
	};
	get = async (fileId: string): Promise<PersistedFileData | null> => {
		const info = await this.db
			.selectFrom('__verdant__fileInfo')
			.select(['id', 'name', 'type', 'deletedAt', 'remote', 'url'])
			.where('id', '=', fileId)
			.executeTakeFirst();

		if (!info) {
			return null;
		}

		try {
			return this.hydrate({
				...info,
				url: info.url ?? `file://${this.directory}/${info.id}/${info.name}`,
			});
		} catch (e) {
			return this.hydrate(info);
		}
	};
	delete = async (fileId: string): Promise<void> => {
		await this.db
			.deleteFrom('__verdant__fileInfo')
			.where('id', '=', fileId)
			.execute();
	};
	markPendingDelete = async (fileId: string): Promise<void> => {
		await this.db
			.updateTable('__verdant__fileInfo')
			.set({ deletedAt: Date.now() })
			.where('id', '=', fileId)
			.execute();
	};
	listUnsynced = async (options?: {
		transaction?: AbstractTransaction;
	}): Promise<PersistedFileData[]> => {
		const result = await this.db
			.selectFrom('__verdant__fileInfo')
			.select(['id', 'name', 'type', 'deletedAt', 'remote', 'url'])
			.where('remote', '=', 0)
			.execute();
		return result.map(this.hydrate);
	};
	resetSyncedStatusSince = async (since: string | null): Promise<void> => {
		await this.db
			.updateTable('__verdant__fileInfo')
			.where((b) =>
				b.or([b.eb('timestamp', '>', since), b.eb('timestamp', '=', null)]),
			)
			.set({ remote: 0 })
			.execute();
	};
	iterateOverPendingDelete = async (
		iterator: (file: PersistedFileData) => void,
	): Promise<void> => {
		const files = await this.db
			.selectFrom('__verdant__fileInfo')
			.select(['id', 'name', 'type', 'deletedAt', 'remote', 'url'])
			.where('deletedAt', '<>', null)
			.execute();
		for (const file of files) {
			iterator(this.hydrate(file));
		}
	};
	getAll = async (options?: {
		transaction?: AbstractTransaction;
	}): Promise<PersistedFileData[]> => {
		const result = await this.db
			.selectFrom('__verdant__fileInfo')
			.select(['id', 'name', 'type', 'deletedAt', 'remote', 'url'])
			.execute();
		return result.map(this.hydrate);
	};
	stats = async (): Promise<{ size: { count: number; size: number } }> => {
		const stats = await this.tableStats('__verdant__fileInfo');
		return {
			size: {
				count: stats?.count ?? 0,
				size: 0, // not supported
			},
		};
	};
}
