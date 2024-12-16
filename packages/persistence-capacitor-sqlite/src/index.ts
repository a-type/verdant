import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Directory, Filesystem } from '@capacitor/filesystem';
import {
	FilesystemImplementation,
	SqlitePersistence,
} from '@verdant-web/persistence-sqlite';
import CapacitorSQLiteKyselyDialect from 'capacitor-sqlite-kysely';
import { Kysely } from 'kysely';

function getKysely(databaseFile: string) {
	return new Kysely<any>({
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
		});
	};
	copyFile = async (options: { from: string; to: string }) => {
		await Filesystem.copy({
			from: options.from,
			to: options.to,
		});
	};
	readFile = async (path: string) => {
		const res = await Filesystem.readFile({
			path,
		});
		if (typeof res.data === 'string') {
			throw new Error(
				"Verdant doesn't support non-Web Capacitor runtime environments.",
			);
		}
		return res.data;
	};
}

export class CapacitorSQLitePersistence extends SqlitePersistence {
	constructor() {
		super({
			getKysely,
			filesystem: new CapacitorFilesystem(),
			databaseDirectory: Directory.Data + '/databases',
			userFilesDirectory: Directory.Data + '/userFiles',
		});
	}
}
