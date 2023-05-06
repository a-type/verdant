import type { StorageSchema } from '@verdant/common';
import type {
	Storage,
	StorageInitOptions,
	ObjectEntity,
	ListEntity,
	Query,
	ServerSync,
} from '@verdant/web';
export * from '@verdant/web';

import type schema from './schema.js';
export type Schema = typeof schema;
export type Item = ObjectEntity<ItemInit, ItemDestructured>;

export interface ItemDoneIndexMatchFilter {
	where: 'doneIndex';
	equals: boolean;
	order?: 'asc' | 'desc';
}

export interface ItemDoneIndexRangeFilter {
	where: 'doneIndex';
	gte?: boolean;
	gt?: boolean;
	lte?: boolean;
	lt?: boolean;
	order?: 'asc' | 'desc';
}

export type ItemFilter = ItemDoneIndexMatchFilter | ItemDoneIndexRangeFilter;

export type ItemDestructured = {
	id: string;
	done: boolean;
	name: string;
	categoryId: string | null;
};
export type ItemInit = {
	id?: string;
	done?: boolean;
	name?: string;
	categoryId?: string | null;
};
export type ItemSnapshot = {
	id: string;
	done: boolean;
	name: string;
	categoryId: string | null;
};
/** Item sub-object types */

type ItemId = string;
type ItemIdInit = ItemId | undefined;
type ItemIdSnapshot = ItemId;
type ItemIdDestructured = ItemId;
type ItemDone = boolean;
type ItemDoneInit = ItemDone | undefined;
type ItemDoneSnapshot = ItemDone;
type ItemDoneDestructured = ItemDone;
type ItemName = string;
type ItemNameInit = ItemName | undefined;
type ItemNameSnapshot = ItemName;
type ItemNameDestructured = ItemName;
type ItemCategoryId = string | null;
type ItemCategoryIdInit = ItemCategoryId | undefined;
type ItemCategoryIdSnapshot = ItemCategoryId;
type ItemCategoryIdDestructured = ItemCategoryId;

export type Category = ObjectEntity<CategoryInit, CategoryDestructured>;

export type CategoryFilter = never;
export type CategoryDestructured = {
	id: string;
	name: string;
};
export type CategoryInit = {
	id?: string;
	name: string;
};
export type CategorySnapshot = {
	id: string;
	name: string;
};
/** Category sub-object types */

type CategoryId = string;
type CategoryIdInit = CategoryId | undefined;
type CategoryIdSnapshot = CategoryId;
type CategoryIdDestructured = CategoryId;
type CategoryName = string;
type CategoryNameInit = CategoryName;
type CategoryNameSnapshot = CategoryName;
type CategoryNameDestructured = CategoryName;

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

	readonly categories: Collection<
		Category,
		CategorySnapshot,
		CategoryInit,
		CategoryFilter
	>;

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
