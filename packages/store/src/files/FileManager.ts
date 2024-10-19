import { FileData } from '@verdant-web/common';
import { Context } from '../context/context.js';
import { Sync } from '../sync/Sync.js';
import { EntityFile, MARK_FAILED, UPDATE } from './EntityFile.js';

export class FileManager {
	private sync;
	private context;

	private cache = new Map<string, EntityFile>();

	constructor({ sync, context }: { sync: Sync; context: Context }) {
		this.sync = sync;
		this.context = context;
	}

	add = async (file: FileData, options?: { downloadRemote: boolean }) => {
		// immediately cache the file
		if (!this.cache.has(file.id)) {
			const entityFile = new EntityFile(file.id, { ctx: this.context });
			entityFile[UPDATE](file);
			this.cache.set(file.id, entityFile);
		} else {
			this.cache.get(file.id)![UPDATE](file);
		}

		await this.context.files.add(file, options);
	};

	/**
	 * Immediately returns an EntityFile to use, then either loads
	 * the file from cache, local database, or the server.
	 */
	get = (id: string, options: { downloadRemote?: boolean; ctx: Context }) => {
		if (this.cache.has(id)) {
			return this.cache.get(id)!;
		}
		const file = new EntityFile(id, options);
		this.cache.set(id, file);
		this.load(file);
		return file;
	};

	private load = async (file: EntityFile) => {
		const fileData = await this.context.files.get(file.id);
		if (fileData) {
			file[UPDATE](fileData);
		} else {
			// maybe we don't have it yet, it might be on the server still.
			try {
				const result = await this.sync.getFile(file.id);
				if (result.success) {
					file[UPDATE](result.data);
					await this.context.files.add(result.data, {
						downloadRemote: file.downloadRemote,
					});
				} else {
					this.context.log('error', 'Failed to load file', result);
					file[MARK_FAILED]();
				}
			} catch (err) {
				this.context.log('error', 'Failed to load file', err);
				file[MARK_FAILED]();
			}
		}
	};
}
