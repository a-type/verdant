import {
	assert,
	debounce,
	DocumentBaseline,
	EventSubscriber,
	Migration,
	Operation,
	SchemaCollection,
} from '@verdant-web/common';
import { Context } from '../context.js';
import { DocumentManager } from '../DocumentManager.js';
import { FileManager, FileManagerConfig } from '../files/FileManager.js';
import {
	closeDatabase,
	deleteAllDatabases,
	getSizeOfObjectStore,
} from '../idb.js';
import { ExportData, Metadata } from '../metadata/Metadata.js';
import { openDocumentDatabase } from '../migration/openDatabase.js';
import { EntityStore } from '../entities/EntityStore.js';
import { NoSync, ServerSync, ServerSyncOptions, Sync } from '../sync/Sync.js';
import { CollectionQueries } from '../queries/CollectionQueries.js';
import { QueryCache } from '../queries/QueryCache.js';

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
}> {
	readonly meta: Metadata;
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
						log: this.context.log,
				  })
				: new NoSync<Presence, Profile>();
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
			context: this.context,
			meta: this.meta,
			files: this._fileManager,
		});
		this._queryCache = new QueryCache({
			context,
		});
		this._documentManager = new DocumentManager(
			this.meta,
			this.schema,
			this._entities,
		);

		const notifyFutureSeen = debounce(() => {
			this.emit('futureSeen');
		}, 300);
		this.context.globalEvents.subscribe('futureSeen', notifyFutureSeen);

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
		baselines: DocumentBaseline[];
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
	 * @deprecated - use client.sync.presence instead
	 */
	get presence() {
		return this.sync.presence;
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

	stats = async () => {
		const collectionNames = Object.keys(this.schema.collections);
		let collections = {} as Record<string, { count: number; size: number }>;
		for (const collectionName of collectionNames) {
			collections[collectionName] = await getSizeOfObjectStore(
				this.documentDb,
				collectionName,
			);
		}
		const meta = await this.meta.stats();
		const storage =
			typeof navigator !== 'undefined' &&
			typeof navigator.storage !== 'undefined' &&
			'estimate' in navigator.storage
				? await navigator.storage.estimate()
				: undefined;

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
			quotaUsage:
				storage?.usage && storage?.quota
					? storage.usage / storage.quota
					: undefined,
		};
	};

	close = async () => {
		this.sync.stop();
		this.sync.dispose();
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

	export = async () => {
		const metaExport = await this.meta.export();
		return Buffer.from(JSON.stringify(metaExport));
	};

	import = async (buffer: Buffer) => {
		this.context.log('Importing data...');
		// close the document DB
		await closeDatabase(this.context.documentDb);

		const metaExport = JSON.parse(buffer.toString()) as ExportData;
		await this.meta.resetFrom(metaExport);
		// now reset the document DB to the specified version
		// and run migrations to get it to the latest version
		const version = metaExport.schema.version;
		const deleteReq = indexedDB.deleteDatabase(
			[this.namespace, 'collections'].join('_'),
		);
		await new Promise((resolve, reject) => {
			deleteReq.onsuccess = resolve;
			deleteReq.onerror = reject;
		});
		// reset our context to the imported schema for now
		const currentSchema = this.context.schema;
		this.context.schema = metaExport.schema;
		// now open the document DB empty at the specified version
		// and initialize it from the meta DB
		this.context.documentDb = await openDocumentDatabase({
			meta: this.meta,
			migrations: this.config.migrations,
			context: this.context,
			version,
		});
		// re-initialize data
		this.context.log('Re-initializing data from imported data...');
		await this._entities.addData({
			operations: metaExport.operations,
			baselines: metaExport.baselines,
			reset: true,
		});
		// close the database and reopen to latest version, applying
		// migrations
		await closeDatabase(this.context.documentDb);
		this.context.log('Migrating up to latest schema...');
		// put the schema back
		this.context.schema = currentSchema;
		this.context.documentDb = await openDocumentDatabase({
			meta: this.meta,
			migrations: this.config.migrations,
			context: this.context,
			version: currentSchema.version,
		});
	};
}
