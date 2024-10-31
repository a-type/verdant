import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import {
	SqlitePersistence,
	SqlitePersistenceConfig,
} from '@verdant-web/persistence-sqlite';
import CapacitorSQLiteKyselyDialect from 'capacitor-sqlite-kysely';
import { Kysely } from 'kysely';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FilesystemImplementation } from '../../persistence-sqlite/src/interfaces';

function getKysely(databaseFile: string) {
	return new Kysely({
		dialect: new CapacitorSQLiteKyselyDialect(
			new SQLiteConnection(CapacitorSQLite),
			{ name: databaseFile },
		) as any,
	});
}

class CapacitorFilesystem implements FilesystemImplementation {
	copyDirectory = async (options: { from: string; to: string }) => {
		await Filesystem.copy({
			from: options.from,
			to: options.to,
			directory: Directory.Data,
		});
	};
	deleteFile = (path: string) => Filesystem.deleteFile({ path });
	readDirectory = async (path: string) => {
		const result = await Filesystem.readdir({ path });
		return result.files.map((f) => f.name);
	};
	writeFile = async (path: string, data: Blob) => {
		await Filesystem.writeFile({
			path,
			data,
			directory: Directory.Data,
		});
	};
}

export class CapacitorSQLitePersistence extends SqlitePersistence {
	constructor(
		config: Omit<SqlitePersistenceConfig, 'getKysely' | 'filesystem'>,
	) {
		super({
			...config,
			getKysely: getKysely,
			filesystem: new CapacitorFilesystem(),
		});
	}
}
