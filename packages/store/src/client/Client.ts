import {
	debounce,
	DocumentBaseline,
	EventSubscriber,
	Migration,
	Operation,
} from '@verdant-web/common';
import { Context } from '../context.js';
import { DocumentManager } from '../entities/DocumentManager.js';
import { EntityStore } from '../entities/EntityStore.js';
import { FileManager, FileManagerConfig } from '../files/FileManager.js';
import { ReturnedFileData } from '../files/FileStorage.js';
import {
	closeDatabase,
	deleteAllDatabases,
	getSizeOfObjectStore,
} from '../idb.js';
import { ExportData, Metadata } from '../metadata/Metadata.js';
import { openQueryDatabase } from '../migration/openQueryDatabase.js';
import { CollectionQueries } from '../queries/CollectionQueries.js';
import { QueryCache } from '../queries/QueryCache.js';
import { NoSync, ServerSync, ServerSyncOptions, Sync } from '../sync/Sync.js';

interface ClientConfig<Presence = any> {
	syncConfig?: ServerSyncOptions<Presence>;
	migrations: Migration[];
	files?: FileManagerConfig;
}

// not actually used below, but helpful for internal code which
// might rely on this stuff...
export type ClientWithCollections = Client & {
	[key: string]: CollectionQueries<any, any, any>;
};

export class Client<Presence = any, Profile = any> extends EventSubscriber<{
	/**
	 * Called when a change from a future version of the application has
	 * been witnessed. These changes are not applied but it indicates
	 * the app has been updated and a peer is using a newer version.
	 * You should listen to this event and prompt the user to reload
	 * their client, or reload it for them.
	 *
	 * This event may be called multiple times.
	 */
	futureSeen: () => void;
	/**
	 * The server requested this replica reset its state
	 * completely. This can happen when the replica has
	 * been offline for too long and reconnects.
	 */
	resetToServer: () => void;
}> {
	readonly meta: Metadata;
	private _entities: EntityStore;
	private _queryCache: QueryCache;
	private _documentManager: DocumentManager<any>;
	private _fileManager: FileManager;
	private _closed = false;

	readonly collectionNames: string[];

	private _sync!: Sync<Presence, Profile>;

	get sync() {
		return this._sync;
	}

	get entities() {
		return this._entities;
	}

	get documentManager() {
		return this._documentManager;
	}

	constructor(
		private config: ClientConfig,
		private context: Context,
		components: { meta: Metadata },
	) {
		super();
		this.meta = components.meta;
		this.collectionNames = Object.keys(context.schema.collections);
		this._sync =
			this.config.syncConfig && !context.schema.wip
				? new ServerSync<Presence, Profile>(this.config.syncConfig, {
						meta: this.meta,
						onData: this.addData,
						ctx: this.context,
				  })
				: new NoSync<Presence, Profile>({ meta: this.meta });
		if (context.schema.wip && this.config.syncConfig) {
			context.log(
				'warn',
				'⚠️⚠️ Sync is disabled for WIP schemas. Commit your schema changes to start syncing again. ⚠️⚠️',
			);
		}

		this._fileManager = new FileManager({
			db: this.metaDb,
			sync: this.sync,
			context: this.context,
			config: this.config.files,
			meta: this.meta,
		});
		this._entities = new EntityStore({
			ctx: this.context,
			meta: this.meta,
			files: this._fileManager,
		});
		this._queryCache = new QueryCache({
			context,
		});
		this._documentManager = new DocumentManager(this.schema, this._entities);

		const notifyFutureSeen = debounce(() => {
			this.emit('futureSeen');
		}, 300);
		this.context.globalEvents.subscribe('futureSeen', notifyFutureSeen);
		this.context.globalEvents.subscribe('resetToServer', () => {
			this.emit('resetToServer');
		});

		this.documentDb.addEventListener('versionchange', () => {
			this.context.log?.(
				`Another tab has requested a version change for ${this.namespace}`,
			);
			this.documentDb.close();
			if (typeof window !== 'undefined') {
				window.location.reload();
			}
		});

		this.metaDb.addEventListener('versionchange', () => {
			this.context.log?.(
				`Another tab has requested a version change for ${this.namespace}`,
			);
			this.metaDb.close();
			if (typeof window !== 'undefined') {
				window.location.reload();
			}
		});

		// self-assign collection shortcuts. these are not typed
		// here but are typed in the generated code...
		for (const [name, _collection] of Object.entries(
			context.schema.collections,
		)) {
			const collectionName = name;
			(this as any)[collectionName] = new CollectionQueries({
				collection: collectionName,
				cache: this._queryCache,
				context: this.context,
				entities: this.entities,
				documentManager: this.documentManager,
			});
		}
	}

	private addData = (data: {
		operations: Operation[];
		baselines?: DocumentBaseline[];
		reset?: boolean;
	}) => {
		return this._entities.addData(data);
	};

	get documentDb() {
		return this.context.documentDb;
	}

	get metaDb() {
		return this.context.metaDb;
	}

	get schema() {
		return this.context.schema;
	}

	get namespace() {
		return this.context.namespace;
	}

	get undoHistory() {
		return this.context.undoHistory;
	}

	/**
	 * Batch multiple operations together to be executed in a single transaction.
	 * The changes made will not be included in the same undo history step as
	 * any other changes made outside of the batch. You can also disable undo
	 * for your batch to omit changes from undo history.
	 *
	 * Provide a batch name to apply multiple changes to the same batch
	 * across different invocations. Batches will automatically flush after
	 * a short delay or if they reach a maximum size.
	 */
	get batch() {
		return this.entities.batch;
	}

	stats = async (): Promise<ClientStats> => {
		const collectionNames = Object.keys(this.schema.collections);
		let collections = {} as Record<string, { count: number; size: number }>;
		if (this.disposed) {
			return {} as any;
		}
		for (const collectionName of collectionNames) {
			try {
				collections[collectionName] = await getSizeOfObjectStore(
					this.documentDb,
					collectionName,
				);
			} catch (err) {
				this.context.log?.('error', err);
			}
		}
		if (this.disposed) {
			return { collections } as any;
		}
		const meta = await this.meta.stats();
		const storage =
			typeof navigator !== 'undefined' &&
			typeof navigator.storage !== 'undefined' &&
			'estimate' in navigator.storage
				? await navigator.storage.estimate()
				: undefined;

		const files = await this._fileManager.stats();

		// determine data:metadata ratio for total size of all collections vs metadata
		const totalCollectionsSize = Object.values(collections).reduce(
			(acc, { size }) => acc + size,
			0,
		);
		const totalMetaSize = meta.baselinesSize.size + meta.operationsSize.size;
		const metaToDataRatio = totalMetaSize / totalCollectionsSize;

		return {
			collections,
			meta,
			storage,
			totalMetaSize,
			totalCollectionsSize,
			metaToDataRatio,
			files,
			quotaUsage:
				storage?.usage && storage?.quota
					? storage.usage / storage.quota
					: undefined,
		};
	};

	close = async () => {
		this._closed = true;
		this.sync.ignoreIncoming();
		await this._entities.flushAllBatches();
		this._fileManager.close();
		this.sync.stop();
		this.sync.destroy();
		// this step does have the potential to flush
		// changes to storage, so don't close metadata db yet
		await this._entities.destroy();

		this.meta.close();

		// the idea here is to flush the microtask queue -
		// we may have queued tasks related to queries that
		// we want to settle before closing the databases
		// to avoid invalid state errors
		await new Promise<void>(async (resolve) => {
			await closeDatabase(this.documentDb);
			await closeDatabase(this.metaDb);
			resolve();
		});

		this.context.log?.('Client closed');
	};

	__dangerous__resetLocal = async () => {
		this.sync.stop();
		await deleteAllDatabases(this.namespace, indexedDB);
	};

	export = async (
		{ downloadRemoteFiles }: { downloadRemoteFiles?: boolean } = {
			downloadRemoteFiles: true,
		},
	) => {
		this.context.log('info', 'Exporting data...');
		const metaExport = await this.meta.export();
		const filesExport = await this._fileManager.exportAll(downloadRemoteFiles);
		// split files into data and files
		const fileData: Array<Omit<ReturnedFileData, 'file'>> = [];
		const files: Array<File> = [];

		for (const fileExport of filesExport) {
			const file = fileExport.file;
			delete fileExport.file;
			fileData.push(fileExport);
			if (file) {
				// rename with ID
				const asFile = new File(
					[file],
					this.getFileExportName(fileExport.name, fileExport.id),
					{
						type: fileExport.type,
					},
				);
				files.push(asFile);
			} else {
				this.context.log(
					'warn',
					`File ${fileExport.id} was could not be loaded locally or from the server. It will be missing in the export.`,
				);
			}
		}
		return {
			data: metaExport,
			fileData,
			files,
		};
	};

	private getFileExportName = (originalFileName: string, id: string) => {
		return `${id}___${originalFileName}`;
	};

	private parseFileExportname = (name: string) => {
		const [id, originalFileName] = name.split('___');
		return { id, originalFileName };
	};

	import = async ({
		data,
		fileData,
		files,
	}: {
		data: ExportData;
		fileData: Array<Omit<ReturnedFileData, 'file'>>;
		files: File[];
	}) => {
		this.context.log('info', 'Importing data...');
		// close the document DB
		await closeDatabase(this.context.documentDb);

		await this.meta.resetFrom(data);
		// re-attach files to their file data and import
		const fileToIdMap = new Map(
			files.map((file) => {
				const { id } = this.parseFileExportname(file.name);
				return [id, file];
			}),
		);
		const importedFiles: ReturnedFileData[] = fileData.map((fileData) => {
			const file = fileToIdMap.get(fileData.id);

			return {
				...fileData,
				file,
			};
		});
		await this._fileManager.importAll(importedFiles);
		// now delete the document DB, open it to the specified version
		// and run migrations to get it to the latest version
		const version = data.schema.version;
		const deleteReq = indexedDB.deleteDatabase(
			[this.namespace, 'collections'].join('_'),
		);
		await new Promise((resolve, reject) => {
			deleteReq.onsuccess = resolve;
			deleteReq.onerror = reject;
		});
		// reset our context to the imported schema for now
		const currentSchema = this.context.schema;
		if (currentSchema.version !== version) {
			// TODO: support importing older schema data - this will
			// require being able to migrate that data, which requires
			// a "live" schema for that version. the client does not currently
			// receive historical schemas, although they should be available
			// if the CLI was used.
			// importing from older versions is also tricky because
			// migration shortcuts mean that versions could get marooned.
			throw new Error(
				`Only exports from the current schema version can be imported`,
			);
		}
		// now open the document DB empty at the specified version
		// and initialize it from the meta DB
		this.context.documentDb = await openQueryDatabase({
			meta: this.meta,
			migrations: this.config.migrations,
			context: this.context,
			version,
		});
		this.context.internalEvents.emit('documentDbChanged', this.documentDb);
		// re-initialize data
		this.context.log('Re-initializing data from imported data...');
		await this._entities.addData({
			operations: data.operations,
			baselines: data.baselines,
			reset: true,
		});
		// close the database and reopen to latest version, applying
		// migrations
		await closeDatabase(this.context.documentDb);
		this.context.log('Migrating up to latest schema...');
		// put the schema back
		this.context.schema = currentSchema;
		this.context.documentDb = await openQueryDatabase({
			meta: this.meta,
			migrations: this.config.migrations,
			context: this.context,
			version: currentSchema.version,
		});
		this.context.internalEvents.emit('documentDbChanged', this.documentDb);
	};

	/**
	 * Export all data, then re-import it. This might resolve
	 * some issues with the local database, but it should
	 * only be done as a second-to-last resort. The last resort
	 * would be __dangerous__resetLocal on ClientDescriptor, which
	 * clears all local data.
	 *
	 * Unlike __dangerous__resetLocal, this method allows local-only
	 * clients to recover data, whereas __dangerous__resetLocal only
	 * lets networked clients recover from the server.
	 */
	__dangerous__hardReset = async () => {
		const exportData = await this.export();
		await this.import(exportData);
	};

	/**
	 * Immediately runs the file deletion process. This is useful
	 * for testing, mostly. Or if your client is long-lived, since
	 * normally this cleanup only runs on startup.
	 *
	 * Note this still follows the file deletion heuristic configured
	 * on the client. So if you clean up files 3 days after delete,
	 * invoking this manually will not skip that 3 day waiting period.
	 */
	__cleanupFilesImmediately = () => {
		return this._fileManager.tryCleanupDeletedFiles();
	};

	/**
	 * Manually triggers storage rebasing. Follows normal
	 * rebasing rules. Rebases already happen automatically
	 * during normal operation, so you probably don't need this.
	 */
	__manualRebase = () => this.meta.manualRebase();
}

export interface ClientStats {
	collections: Record<string, { count: number; size: number }>;
	meta: {
		baselinesSize: { count: number; size: number };
		operationsSize: { count: number; size: number };
	};
	files: {
		size: { count: number; size: number };
	};
	storage: StorageEstimate | undefined;
	totalMetaSize: number;
	totalCollectionsSize: number;
	metaToDataRatio: number;
	quotaUsage: number | undefined;
}
