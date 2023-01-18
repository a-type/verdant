import type { StorageSchema } from '@lo-fi/common';
import type {
	Storage,
	StorageInitOptions,
	ObjectEntity,
	ListEntity,
	Query,
	ServerSync,
} from '@lo-fi/web';
export * from '@lo-fi/web';

import type schema from './schema';
export type Schema = typeof schema;
export type Item = ObjectEntity<ItemInit, ItemDestructured>;

export type ItemFilter = never;
export type ItemDestructured = {
	id: string;
	content: string;
	done: boolean;
};
export type ItemInit = {
	id?: string;
	content?: string;
	done?: boolean;
};
export type ItemSnapshot = {
	id: string;
	content: string;
	done: boolean;
};
/** Item sub-object types */

type ItemId = string;
type ItemIdInit = ItemId | undefined;
type ItemIdSnapshot = ItemId;
type ItemIdDestructured = ItemId;
type ItemContent = string;
type ItemContentInit = ItemContent | undefined;
type ItemContentSnapshot = ItemContent;
type ItemContentDestructured = ItemContent;
type ItemDone = boolean;
type ItemDoneInit = ItemDone | undefined;
type ItemDoneSnapshot = ItemDone;
type ItemDoneDestructured = ItemDone;

interface Collection<
	Document extends ObjectEntity<any>,
	Snapshot,
	Init,
	Filter,
> {
	/**
	 * @deprecated use put
	 */
	create: (init: Init) => Promise<Document>;
	put: (init: Init) => Promise<Document>;
	delete: (id: string) => Promise<void>;
	deleteAll: (ids: string[]) => Promise<void>;
	get: (id: string) => Query<Document>;
	findOne: (filter: Filter) => Query<Document>;
	findAll: (filter?: Filter) => Query<Document[]>;
}

export class Client<Presence = any, Profile = any> {
	readonly items: Collection<Item, ItemSnapshot, ItemInit, ItemFilter>;

	sync: ServerSync<Profile, Presence>;
	undoHistory: Storage['undoHistory'];
	namespace: Storage['namespace'];
	entities: Storage['entities'];
	queryStore: Storage['queryStore'];
	batch: Storage['batch'];

	close: Storage['close'];

	export: Storage['export'];
	import: Storage['import'];

	stats: () => Promise<any>;
	/**
	 * Resets all local data. Use with caution. If this replica
	 * is synced, it can restore from the server, but if it is not,
	 * the data will be permanently lost.
	 */
	__dangerous__resetLocal: Storage['__dangerous__resetLocal'];
}

// schema is provided internally. loadInitialData must be revised to pass the typed Client
interface ClientInitOptions<Presence = any, Profile = any>
	extends Omit<StorageInitOptions<Presence, Profile>, 'schema'> {}

export class ClientDescriptor<Presence = any, Profile = any> {
	constructor(init: ClientInitOptions<Presence, Profile>);
	open: () => Promise<Client<Presence, Profile>>;
	readonly current: Client<Presence, Profile> | null;
	readonly readyPromise: Promise<Client<Presence, Profile>>;
	readonly schema: StorageSchema;
	readonly namespace: string;
	close: () => Promise<void>;
}
