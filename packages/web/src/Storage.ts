import {
	RebasesMessage,
	ServerMessage,
	StorageSchema,
	SyncResponseMessage,
	Migration,
	assert,
	StorageCollectionSchema,
} from '@lofi/common';
import { initializeDatabases } from './databaseManagement.js';
import { Meta } from './Meta.js';
import { StorageCollection } from './StorageCollection.js';
import { WebsocketSync } from './Sync.js';
import { TEST_API } from './constants.js';
import { Heartbeat } from './Heartbeat.js';
import { PresenceManager } from './PresenceManager.js';
import type { Presence, Profile } from './index.js';

export interface StorageOptions<
	Schema extends StorageSchema<{
		[key: string]: StorageCollectionSchema<any, any, any>;
	}>,
	TPresence extends Presence,
> {
	schema: Schema;
	migrations?: Migration[];
	syncOptions: {
		host: string;
	};
	/** Provide an explicit IDBFactory for non-browser environments */
	indexedDB?: IDBFactory;
	initialPresence: TPresence;
}

type SchemaToCollections<
	Schema extends StorageSchema<{
		[key: string]: StorageCollectionSchema<any, any, any>;
	}>,
> = {
	[key in keyof Schema['collections']]: StorageCollection<
		Schema['collections'][key]
	>;
};

export class Storage<
	Schema extends StorageSchema<{
		[key: string]: StorageCollectionSchema<any, any, any>;
	}>,
	TProfile extends Profile = Profile,
	TPresence extends Presence = Presence,
> {
	private _collections: SchemaToCollections<Schema> = {} as any;
	private schema: Schema;
	private _sync: WebsocketSync;
	private _heartbeat: Heartbeat;
	private meta: Meta;
	private indexedDB: IDBFactory;
	private _presence: PresenceManager<TProfile, TPresence>;

	private _database: Promise<IDBDatabase>;
	private _initializedPromise: Promise<void>;
	private initialPresence: TPresence;

	constructor(options: StorageOptions<Schema, TPresence>) {
		this.schema = options.schema;
		this._sync = new WebsocketSync({
			...options.syncOptions,
		});
		this.indexedDB = options.indexedDB || window.indexedDB;
		this.initialPresence = options.initialPresence;

		this._sync.subscribe('onlineChange', this.handleOnlineChange);
		this._sync.subscribe('message', this.handleSyncMessage);

		// centralized storage for all stored operations
		this.meta = new Meta(this._sync, options.indexedDB);

		this._presence = new PresenceManager(this._sync, this.meta);

		this._heartbeat = new Heartbeat({
			sync: this._sync,
			meta: this.meta,
		});
		this._heartbeat.subscribe('missed', this._sync.reconnect);

		this._database = initializeDatabases({
			schema: this.schema,
			migrations: options.migrations || [],
			indexedDB: options.indexedDB,
			meta: this.meta,
		});
		this._initializedPromise = this.initialize();
		for (const [name, collection] of Object.entries(this.schema.collections)) {
			this._collections[name as keyof Schema['collections']] =
				new StorageCollection<
					Schema['collections'][keyof Schema['collections']]
				>(
					this.readyDatabasePromise,
					collection as Schema['collections'][keyof Schema['collections']],
					this._sync,
					this.meta,
				);
		}
	}

	private get readyDatabasePromise() {
		return this._initializedPromise.then(() => this._database);
	}

	get sync() {
		return this._sync;
	}

	get presence() {
		return this._presence;
	}

	get ready() {
		return this.readyDatabasePromise.then();
	}

	private initialize = async () => {
		// wait for migration to complete - if migrations fail we cannot
		// store the new schema.
		await this._database;

		const storedSchema = await this.meta.getSchema();
		if (storedSchema) {
			// version changes will be handled by migration routines in
			// the actual idb database loading code (see: initializeDatabases)

			// but this check determines if the schema has been changed without
			// a version change. if so, it will error.
			if (
				storedSchema.version === this.schema.version &&
				JSON.stringify(storedSchema) !== JSON.stringify(this.schema)
			) {
				throw new Error(
					'Schema has changed without a version change! Any changes to your schema must be accompanied by a change in schema version and a migration routine.',
				);
			}
		}

		await this.meta.setSchema(this.schema);
	};

	get<T extends keyof Schema['collections']>(
		name: T,
	): StorageCollection<Schema['collections'][T]> {
		const collection = this._collections[name];
		assert(
			!!collection,
			'Sanity check: collection ' + collection + ' not found',
		);
		return collection;
	}

	get collections() {
		return this._collections;
	}

	private handleSyncMessage = (message: ServerMessage) => {
		switch (message.type) {
			case 'op-re':
				for (const op of message.ops) {
					this.get(op.collection).applyRemoteOperation(op);
				}
				break;
			case 'sync-resp':
				this.handleSyncResponse(message);
				break;
			case 'rebases':
				this.handleRebases(message);
				break;
		}
	};

	private handleSyncResponse = async (message: SyncResponseMessage) => {
		// store the global ack info
		await this.meta.setGlobalAck(message.globalAckTimestamp);

		// we need to add all operations to the operation history
		// and then recompute views of each affected document
		const affectedDocuments = await this.meta.insertRemoteOperations(
			message.ops,
		);
		// refresh all those documents
		for (const doc of affectedDocuments) {
			this.get(doc.collection).recomputeDocument(doc.documentId);
		}

		// respond to the server
		const sync2 = await this.meta.getSyncStep2(message.provideChangesSince);
		this.sync.send({
			type: 'sync-step2',
			...sync2,
		});
		await this.meta.updateLastSynced();
	};

	private handleRebases = async (message: RebasesMessage) => {
		for (const rebase of message.rebases) {
			this.collections[rebase.collection].rebaseDocument(
				rebase.documentId,
				rebase.upTo,
			);
		}
	};

	private handleOnlineChange = async (online: boolean) => {
		if (!online) {
			this._heartbeat.stop();
		} else {
			const sync = await this.meta.getSync();
			this.sync.send({
				type: 'sync',
				...sync,
				schemaVersion: this.schema.version,
			});
			this.sync.send(await this.meta.getPresenceUpdate(this.initialPresence));
			this._heartbeat.start();
		}
	};

	stats = async () => {
		const base = {
			meta: await this.meta.stats(),
			collections: Object.entries(this.collections).reduce<Record<string, any>>(
				(acc, [name, coll]) => {
					acc[name] = coll.stats();
					return acc;
				},
				{} as Record<string, any>,
			),
		};

		return base;
	};

	[TEST_API] = {
		uninstall: async () => {
			this.meta[TEST_API].uninstall();
			this.indexedDB.deleteDatabase('collections');
		},
	};
}

export function storage<
	Schema extends StorageSchema<{
		[k: string]: StorageCollectionSchema<any, any, any>;
	}>,
	TPresence extends Presence = Presence,
>(options: StorageOptions<Schema, TPresence>) {
	return new Storage<Schema, Profile, Presence>(options);
}
