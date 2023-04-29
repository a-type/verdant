import {
	assert,
	DocumentBaseline,
	Migration,
	Operation,
	SchemaCollection,
} from '@lo-fi/common';
import { Context } from '../context.js';
import { DocumentManager } from '../DocumentManager.js';
import { FileManager, FileManagerConfig } from '../files/FileManager.js';
import { closeDatabase, getSizeOfObjectStore } from '../idb.js';
import { Entity } from '../index.js';
import { ExportData, Metadata } from '../metadata/Metadata.js';
import { openDocumentDatabase } from '../openDocumentDatabase.js';
import { LiveQuery } from '../queries/LiveQuery.js';
import { LiveQueryMaker } from '../queries/LiveQueryMaker.js';
import { LiveQueryStore } from '../queries/LiveQueryStore.js';
import { EntityStore } from '../reactives/EntityStore.js';
import { NoSync, ServerSync, ServerSyncOptions, Sync } from '../sync/Sync.js';

interface ClientConfig<Presence = any> {
	syncConfig?: ServerSyncOptions<Presence>;
	migrations: Migration[];
	files?: FileManagerConfig;
}

export interface CollectionApi {
	put: (init: any) => Promise<Entity>;
	delete: (id: string) => Promise<void>;
	deleteAll: (ids: string[]) => Promise<void>;
	get: (id: string) => LiveQuery<Entity | null>;
	findOne: (filter: any) => LiveQuery<Entity | null>;
	findAll: (filter?: any) => LiveQuery<Entity[]>;
	findAllPaginated: (
		filter?: any,
		limit?: number,
	) => LiveQuery<Entity[], { offset?: number }>;
	findAllInfinite: (
		filter?: any,
		limit?: number,
	) => LiveQuery<Entity[], { offset?: number }>;
}

// not actually used below, but helpful for internal code which
// might rely on this stuff...
export type ClientWithCollections = Client & {
	[key: string]: CollectionApi;
};

export class Client {
	readonly meta: Metadata;
	private _entities!: EntityStore;
	private _queryStore!: LiveQueryStore;
	private _queryMaker!: LiveQueryMaker;
	private _documentManager!: DocumentManager<any>;
	private _fileManager!: FileManager;

	readonly collectionNames: string[];

	private _sync!: Sync;

	get queryMaker() {
		return this._queryMaker;
	}

	get sync() {
		return this._sync;
	}

	get entities() {
		return this._entities;
	}

	get queryStore() {
		return this._queryStore;
	}

	get documentManager() {
		return this._documentManager;
	}

	constructor(
		private config: ClientConfig,
		private context: Context,
		components: { meta: Metadata },
	) {
		this.meta = components.meta;
		this.collectionNames = Object.keys(context.schema.collections);
		this.initialize();

		// self-assign collection shortcuts. these are not typed
		// here but are typed in the generated code...
		for (const [name, _collection] of Object.entries(
			context.schema.collections,
		)) {
			const collection = _collection as SchemaCollection<any, any>;
			const collectionName = collection.pluralName ?? collection.name + 's';
			// TODO: untangle this requirement
			assert(
				collectionName === name,
				`The key of the collection in the schema must be the plural of the name (expected: "${collectionName}")`,
			);
			// @ts-ignore
			this[collectionName] = {
				/** @deprecated - use put */
				create: (doc: any) => this._documentManager.create(collectionName, doc),
				put: (doc: any) => this._documentManager.create(collectionName, doc),
				delete: (id: string) =>
					this._documentManager.delete(collectionName, id),
				deleteAll: (ids: string[]) =>
					this._documentManager.deleteAll(
						ids.map((id) => [collectionName, id]),
					),
				get: (id: string) => this._queryMaker.get(collectionName, id),
				findOne: (query: any) =>
					this._queryMaker.findOne(collectionName, query),
				findAll: (query: any) =>
					this._queryMaker.findAll(collectionName, query),
				findAllPaginated: (query: any, limit: number) =>
					this._queryMaker.findAllPaginated(collectionName, query, limit),
				findAllInfinite: (query: any, limit: number) =>
					this._queryMaker.findAllInfinite(collectionName, query, limit),
			} as CollectionApi;
		}
	}

	private addData = (data: {
		operations: Operation[];
		baselines: DocumentBaseline[];
		reset?: boolean;
	}) => {
		return this._entities.addData(data);
	};

	private initialize = () => {
		this._sync = this.config.syncConfig
			? new ServerSync(this.config.syncConfig, {
					meta: this.meta,
					onData: this.addData,
					log: this.context.log,
			  })
			: new NoSync();

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
		this._queryStore = new LiveQueryStore(this._entities, this.context);
		this._queryMaker = new LiveQueryMaker(this._queryStore, this.context);
		this._documentManager = new DocumentManager(
			this.meta,
			this.schema,
			this._entities,
		);

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
		await this.entities.flushPatches();
		this.sync.stop();
		this.sync.dispose();

		this.meta.close();

		this._queryStore.destroy();
		this._entities.destroy();

		await closeDatabase(this.documentDb);
		await closeDatabase(this.metaDb);

		this.context.log?.('Client closed');
	};

	__dangerous__resetLocal = async () => {
		this.sync.stop();
		const req1 = indexedDB.deleteDatabase([this.namespace, 'meta'].join('_'));
		const req2 = indexedDB.deleteDatabase(
			[this.namespace, 'collections'].join('_'),
		);
		await Promise.all([
			new Promise((resolve, reject) => {
				req1.onsuccess = resolve;
				req1.onerror = reject;
			}),
			new Promise((resolve, reject) => {
				req2.onsuccess = resolve;
				req2.onerror = reject;
			}),
		]);
		window.location.reload();
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
		// re-initialize query store
		this._queryStore.updateAll();
	};
}
