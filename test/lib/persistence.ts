import {
	NodeFilesystem,
	SqlitePersistence,
} from '@verdant-web/persistence-sqlite';
import { PersistenceImplementation } from '@verdant-web/store';
import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { Kysely, SqliteDialect } from 'kysely';

const cleanupDirs = new Array<string>();
export function getPersistence() {
	let persistence: PersistenceImplementation | undefined = undefined;
	if (process.env.SQLITE) {
		const dbDirectory = `./.client-sqlite/${Math.random()
			.toFixed(10)
			.slice(2)}`;
		cleanupDirs.push(dbDirectory);
		persistence = new SqlitePersistence({
			databaseDirectory: dbDirectory,
			filesystem: new NodeFilesystem(),
			getKysely: (databaseFile) =>
				new Kysely({
					dialect: new SqliteDialect({
						database: new Database(databaseFile),
					}),
				}),
			userFilesDirectory: `${dbDirectory}/files`,
		});
		mkdirSync(dbDirectory, { recursive: true });
	}
	return persistence;
}

// afterAll(async () => {
// 	if (process.env.SQLITE) {
// 		await new Promise((resolve) => {
// 			setTimeout(resolve, 1000);
// 		});
// 		for (const dir of cleanupDirs) {
// 			try {
// 				rmdirSync(dir, { recursive: true });
// 			} catch (e) {
// 				console.error('Failed to cleanup', dir, e);
// 			}
// 		}
// 	}
// });
