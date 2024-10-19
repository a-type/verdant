import {
	debounce,
	DocumentBaseline,
	EventSubscriber,
	Operation,
} from '@verdant-web/common';
import { Context } from '../context/context.js';
import { DocumentManager } from '../entities/DocumentManager.js';
import { EntityStore } from '../entities/EntityStore.js';
import { FileManager } from '../files/FileManager.js';
import { deleteAllDatabases } from '../persistence/idb/util.js';
import { CollectionQueries } from '../queries/CollectionQueries.js';
import { QueryCache } from '../queries/QueryCache.js';
import { NoSync, ServerSync, Sync } from '../sync/Sync.js';
import { getLatestVersion } from '../utils/versions.js';
import { ExportedData } from '../persistence/interfaces.js';
import { importPersistence } from '../persistence/persistence.js';

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
	/**
	 * These are errors that, as a developer, you should subscribe to
	 * and prompt users to contact you for resolution. Usually these errors
	 * indicate the client is in an unrecoverable state.
	 */
	developerError: (err: Error) => void;
	/**
	 * Listen for operations as they are applied to the database.
	 * Wouldn't recommend using this unless you know what you're doing.
	 * It's a very hot code path...
	 */
	operation: (operation: Operation) => void;
}> {
	private _entities: EntityStore;
	private _queryCache: QueryCache;
	private _documentManager: DocumentManager<any>;
	private _fileManager: FileManager;

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

	constructor(private context: Context) {
		super();
		this.collectionNames = Object.keys(context.schema.collections);
		this._sync =
			this.context.config.sync && !context.schema.wip
				? new ServerSync<Presence, Profile>(this.context.config.sync, {
						onData: this.addData,
						ctx: this.context,
				  })
				: new NoSync<Presence, Profile>(this.context);
		if (context.schema.wip && this.context.config.sync) {
			context.log(
				'warn',
				'⚠️⚠️ Sync is disabled for WIP schemas. Commit your schema changes to start syncing again. ⚠️⚠️',
			);
		}

		this._fileManager = new FileManager({
			sync: this.sync,
			context: this.context,
		});
		this._queryCache = new QueryCache({
			context,
		});
		this._entities = new EntityStore({
			ctx: this.context,
			files: this._fileManager,
		});
		this._documentManager = new DocumentManager(this.schema, this._entities);

		const notifyFutureSeen = debounce(() => {
			this.emit('futureSeen');
		}, 300);
		this.context.globalEvents.subscribe('futureSeen', notifyFutureSeen);
		this.context.globalEvents.subscribe('resetToServer', () => {
			this.emit('resetToServer');
		});
		this.context.globalEvents.subscribe('operation', (operation) => {
			this.emit('operation', operation);
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

	private importingPromise = Promise.resolve();
	private addData = async (data: {
		operations: Operation[];
		baselines?: DocumentBaseline[];
		reset?: boolean;
	}) => {
		// always wait for an ongoing import to complete before handling data.
		await this.importingPromise;

		try {
			const schemaVersion = data.reset
				? getLatestVersion(data)
				: this.schema.version;

			if (schemaVersion < this.schema.version) {
				/**
				 * Edge case: the server has an older version of the library
				 * than the client schema, but it wants the client to reset.
				 *
				 * This happens when a truant or new client loads up newest client
				 * code with a new schema version, but the last sync to the
				 * server was from an old version. It's particularly a problem
				 * if the new schema drops collections, since the IDB table for
				 * that collection will no longer exist, so loading in old data
				 * will result in an error.
				 *
				 * To handle this, we treat the reset data as if it were an import
				 * of exported data. The import procedure handles older
				 * schema versions by resetting the database to the imported
				 * version, then migrating up to the current version.
				 */
				this.context.log(
					'warn',
					'Incoming reset sync data is from an old schema version',
					schemaVersion,
					`(current ${this.schema.version})`,
				);
				// run through the import flow to properly handle old versions
				return await this.import({
					data: {
						operations: data.operations,
						baselines: data.baselines ?? [],
						// keep existing
						localReplica: undefined,
						schemaVersion,
					},
					fileData: [],
					files: [],
				});
			} else {
				return await this._entities.addData(data);
			}
		} catch (err) {
			this.context.log('critical', 'Sync failed', err);
			this.emit(
				'developerError',
				new Error('Sync failed, see logs or cause', {
					cause: err,
				}),
			);
			throw err;
		}
	};

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
		if (this.disposed) {
			return {} as any;
		}
		const collections = await this.context.queries.stats();
		const meta = await this.context.meta.stats();
		const storage =
			typeof navigator !== 'undefined' &&
			typeof navigator.storage !== 'undefined' &&
			'estimate' in navigator.storage
				? await navigator.storage.estimate()
				: undefined;

		const files = await this.context.files.stats();

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
		this.context.closing = true;
		this.sync.ignoreIncoming();
		await this._entities.flushAllBatches();
		this.context.files.dispose();
		this.sync.stop();
		this.sync.destroy();
		// this step does have the potential to flush
		// changes to storage, so don't close metadata db yet
		await this._entities.destroy();

		this.context.queries.dispose();
		this.context.meta.dispose();

		// the idea here is to flush the microtask queue -
		// we may have queued tasks related to queries that
		// we want to settle before closing the databases
		// to avoid invalid state errors
		await new Promise<void>((resolve) => {
			resolve();
		});

		this.context.log?.('info', 'Client closed');
	};

	__dangerous__resetLocal = async () => {
		this.sync.stop();
		await deleteAllDatabases(this.namespace, indexedDB);
	};

	export = async (
		{ downloadRemoteFiles }: { downloadRemoteFiles?: boolean } = {
			downloadRemoteFiles: true,
		},
	): Promise<ExportedData> => {
		this.context.log('info', 'Exporting data...');
		const metaExport = await this.context.meta.export();
		const { fileData, files } =
			await this.context.files.export(downloadRemoteFiles);
		return {
			data: metaExport,
			fileData,
			files,
		};
	};

	import = async ({ data, fileData, files }: ExportedData) => {
		/**
		 * Importing is a pretty involved procedure because of the possibility of
		 * importing an export from an older version of the schema. We can't add
		 * data from older schemas because the indexes may have changed or whole
		 * collections may have been since deleted, leaving no corresponding IDB
		 * tables.
		 *
		 * Since IDB doesn't allow us to go backwards, and we are resetting all
		 * data anyways, the import procedure blows away the current queryable DB
		 * and restarts from the imported schema version. It then migrates up
		 * to the latest (current) version. These migrations are added to the imported
		 * data to produce the final state.
		 */

		// register importing promise to halt other data handling
		let resolve = () => {};
		this.importingPromise = new Promise<void>((res) => {
			resolve = res;
		});

		this.context.log('info', 'Importing data...');

		await importPersistence(this.context, { data, files, fileData });

		// finally... clear out memory cache of entities and
		// re-run all active queries.
		// this.entities.clearCache();
		// this._queryCache.forceRefreshAll();

		// ^ this is now done via the persistenceReset internal event.

		resolve();
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
		return this.context.files.cleanupDeletedFiles();
	};

	/**
	 * Manually triggers storage rebasing. Follows normal
	 * rebasing rules. Rebases already happen automatically
	 * during normal operation, so you probably don't need this.
	 */
	__manualRebase = () => this.context.meta.manualRebase();
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
