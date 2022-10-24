import {
	Migration,
	SchemaCollection,
	SchemaCollectionName,
	StorageSchema,
} from '@lo-fi/common';
import { Sync } from './Sync.js';
import { Metadata, openMetadataDatabase } from './Metadata.js';
import { QueryMaker } from './QueryMaker.js';
import { QueryStore } from './QueryStore.js';
import { PresenceManager } from './PresenceManager.js';
import { openDocumentDatabase } from './openDocumentDatabase.js';
import { DocumentManager } from './DocumentManager.js';
import { EntityStore } from './EntityStore.js';
import { getSizeOfObjectStore } from './idb.js';
import { SyncHarness } from './SyncHarness.js';
import type { Presence } from './index.js';

export class Storage {
	private entities = new EntityStore(
		this.documentDb,
		this.schema,
		this.meta,
		this.sync,
	);
	private syncHarness;
	private queryStore = new QueryStore(this.documentDb, this.entities);
	queryMaker = new QueryMaker(this.queryStore, this.schema);
	documentManager = new DocumentManager(this.meta, this.schema, this.entities);
	readonly presence = new PresenceManager(this.sync, this.meta);

	readonly collectionNames: string[];

	constructor(
		private meta: Metadata,
		private schema: StorageSchema<any>,
		private metaDb: IDBDatabase,
		private documentDb: IDBDatabase,
		public sync: Sync,
		initialPresence: Presence,
		private namespace: string,
	) {
		this.collectionNames = Object.keys(schema.collections);
		this.syncHarness = new SyncHarness({
			sync: this.sync,
			meta: this.meta,
			entities: this.entities,
			initialPresence,
		});

		// self-assign collection shortcuts. these are not typed
		// here but are typed in the generated code...
		for (const _collection of Object.values(schema.collections)) {
			const collection = _collection as SchemaCollection<any, any>;
			const collectionName = collection.pluralName ?? collection.name + 's';
			// @ts-ignore
			this[collectionName] = {
				create: (doc: any) => this.documentManager.create(collection.name, doc),
				upsert: (doc: any) => this.documentManager.upsert(collection.name, doc),
				delete: (id: string) =>
					this.documentManager.delete(collection.name, id),
				get: (id: string) => this.queryMaker.get(collection.name, id),
				findOne: (query: any) =>
					this.queryMaker.findOne(collection.name, query),
				findAll: (query: any) =>
					this.queryMaker.findAll(collection.name, query),
			};
		}
	}

	create: this['documentManager']['create'] = async (...args) => {
		return this.documentManager.create(...args);
	};

	upsert: this['documentManager']['upsert'] = async (...args) => {
		return this.documentManager.upsert(...args);
	};

	delete: this['documentManager']['delete'] = async (...args) => {
		return this.documentManager.delete(...args);
	};

	get: this['queryMaker']['get'] = (...args) => {
		return this.queryMaker.get(...args);
	};

	findOne: this['queryMaker']['findOne'] = (...args) => {
		return this.queryMaker.findOne(...args);
	};

	findAll: this['queryMaker']['findAll'] = (...args) => {
		return this.queryMaker.findAll(...args);
	};

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
}

export interface StorageInitOptions<Schema extends StorageSchema<any>> {
	schema: Schema;
	migrations: Migration[];
	sync: Sync;
	indexedDb?: IDBFactory;
	initialPresence: Presence;
	namespace: string;
}

/**
 * Since storage initialization is async, this class wraps the core
 * Storage creation promise and exposes some metadata which can
 * be useful immediately.
 */
export class StorageDescriptor<Schema extends StorageSchema<any>> {
	private readonly _readyPromise: Promise<Storage>;
	// assertions because these are defined by plucking them from
	// Promise initializer
	private resolveReady!: (storage: Storage) => void;
	private rejectReady!: (err: Error) => void;
	private _resolvedValue: Storage | undefined;
	private _initializing = false;
	private _namespace: string;

	constructor(private readonly init: StorageInitOptions<Schema>) {
		this._readyPromise = new Promise((resolve, reject) => {
			this.resolveReady = resolve;
			this.rejectReady = reject;
		});
		this._namespace = init.namespace;
	}

	private initialize = async (init: StorageInitOptions<Schema>) => {
		if (this._initializing) {
			return this._readyPromise;
		}
		this._initializing = true;
		try {
			const metaDb = await openMetadataDatabase(
				this._namespace,
				init.indexedDb,
			);
			const meta = new Metadata(metaDb, init.sync, init.schema);

			const documentDb = await openDocumentDatabase({
				namespace: this._namespace,
				schema: init.schema,
				meta,
				migrations: init.migrations,
				indexedDB: init.indexedDb,
			});

			const storage = new Storage(
				meta,
				init.schema,
				metaDb,
				documentDb,
				init.sync,
				init.initialPresence,
				this._namespace,
			);
			this.resolveReady(storage);
			this._resolvedValue = storage;
			return storage;
		} catch (err) {
			this.rejectReady(err as Error);
			throw err;
		} finally {
			this._initializing = false;
		}
	};

	get current() {
		// exposing an immediate value if already resolved lets us
		// skip the promise microtask when accessing this externally if
		// the initialization has been completed.
		return this._resolvedValue;
	}

	get readyPromise() {
		return this._readyPromise;
	}

	get schema() {
		return this.init.schema;
	}

	open = () => this.initialize(this.init);
}
