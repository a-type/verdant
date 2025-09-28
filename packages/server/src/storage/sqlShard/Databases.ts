import { assert } from '@verdant-web/common';
import { existsSync, mkdirSync } from 'fs';
import { Logger } from '../../logger.js';
import {
	createFilesystemExecutor,
	openDatabase,
	SqliteExecutor,
} from './database.js';

export class Databases {
	private openPromises: Record<string, Promise<SqliteExecutor>> = {};
	private cache: Record<string, SqliteExecutor> = {};
	private closeTimeouts: Record<string, NodeJS.Timeout> = {};
	private openedPreviously: Record<string, boolean> = {};
	private directory;
	private closeTimeout;
	private disableWal = false;
	private closed = new WeakMap<SqliteExecutor, boolean>();
	private log: Logger;

	constructor(config: {
		directory: string;
		closeTimeout?: number;
		disableWal?: boolean;
		log?: Logger;
	}) {
		this.directory = config.directory;
		this.closeTimeout = config.closeTimeout ?? 1000 * 60 * 60;
		this.disableWal = config.disableWal ?? false;
		if (this.directory !== ':memory:' && !existsSync(this.directory)) {
			mkdirSync(this.directory, { recursive: true });
		}
		this.log = config.log ?? (() => {});
	}

	get = async (libraryId: string): Promise<SqliteExecutor> => {
		let db = this.cache[libraryId];
		if (db) {
			if (!this.closed.get(db)) {
				this.enqueueClose(libraryId);
				return this.cache[libraryId];
			}
		}
		let openPromise = this.openPromises[libraryId];
		if (!openPromise) {
			this.openPromises[libraryId] = openDatabase(
				createFilesystemExecutor(this.directory, libraryId, {
					disableWal: this.disableWal,
					log: this.log,
				}),
			);
			openPromise = this.openPromises[libraryId];
		}
		db = await openPromise;
		this.openedPreviously[libraryId] = true;
		this.cache[libraryId] = db;
		delete this.openPromises[libraryId];
		this.enqueueClose(libraryId);
		assert(db, `Database was not loaded: ${libraryId}`);
		return db;
	};

	private enqueueClose = (libraryId: string) => {
		clearTimeout(this.closeTimeouts[libraryId]);
		this.closeTimeouts[libraryId] = setTimeout(
			this.close,
			this.closeTimeout,
			libraryId,
		);
	};

	close = (libraryId: string) => {
		clearTimeout(this.closeTimeouts[libraryId]);
		delete this.openPromises[libraryId];
		const db = this.cache[libraryId];
		if (db) {
			this.closed.set(db, true);
			delete this.cache[libraryId];
			db.close();
		}
	};

	destroy = async () => {
		for (const libraryId in this.cache) {
			this.close(libraryId);
		}
	};
}
