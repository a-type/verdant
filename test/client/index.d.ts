import type schema from './schema.js';
import type { StorageSchema } from '@verdant/common';
import type {
	Storage,
	StorageInitOptions,
	ObjectEntity,
	ListEntity,
	Query,
	ServerSync,
	EntityFile,
	CollectionQueries,
} from '@verdant/web';
export * from '@verdant/web';
export type Schema = typeof schema;

interface Collection<
	Document extends ObjectEntity<any, any>,
	Snapshot,
	Init,
	Filter,
> {
	put: (init: Init, options?: { undoable?: boolean }) => Promise<Document>;
	delete: (id: string, options?: { undoable?: boolean }) => Promise<void>;
	deleteAll: (ids: string[], options?: { undoable?: boolean }) => Promise<void>;
	get: (id: string) => Query<Document>;
	findOne: (filter: Filter) => Query<Document>;
	findAll: (filter?: Filter) => Query<Document[]>;
	findAllPaginated: (
		filter?: Filter,
		pageSize?: number,
	) => Query<Document[], { offset?: number }>;
	findAllInfinite: (
		filter?: Filter,
		pageSize?: number,
	) => Query<Document[], { offset?: number }>;
}

export class Client<Presence = any, Profile = any> {
	readonly items: CollectionQueries<Item, ItemInit, ItemFilter>;

	readonly categories: CollectionQueries<
		Category,
		CategoryInit,
		CategoryFilter
	>;

	sync: ServerSync<Profile, Presence>;
	undoHistory: Storage['undoHistory'];
	namespace: Storage['namespace'];
	entities: Storage['entities'];
	queryStore: Storage['queryStore'];
	batch: Storage['batch'];
	files: Storage['files'];

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
export type Item = ObjectEntity<ItemInit, ItemDestructured>;

export interface ItemCategoryIdMatchFilter {
	where: 'categoryId';
	equals: string | null;
	order?: 'asc' | 'desc';
}

export interface ItemCategoryIdRangeFilter {
	where: 'categoryId';
	gte?: string | null;
	gt?: string | null;
	lte?: string | null;
	lt?: string | null;
	order?: 'asc' | 'desc';
}

export interface ItemCategoryIdStartsWithFilter {
	where: 'categoryId';
	startsWith: string;
	order?: 'asc' | 'desc';
}
export type ItemFilter =
	| ItemCategoryIdMatchFilter
	| ItemCategoryIdRangeFilter
	| ItemCategoryIdStartsWithFilter;

export type ItemDestructured = {
	id: string;
	content: string;
	tags: ItemTags;
	purchased: boolean;
	categoryId: string | null;
	comments: ItemComments;
	image: ItemImage | null;
};
export type ItemInit = {
	id?: string;
	content?: string;
	tags?: ItemTagsInit;
	purchased?: boolean;
	categoryId?: string | null;
	comments?: ItemCommentsInit;
	image?: ItemImageInit | null;
};
export type ItemSnapshot = {
	id: string;
	content: string;
	tags: ItemTagsSnapshot;
	purchased: boolean;
	categoryId: string | null;
	comments: ItemCommentsSnapshot;
	image: ItemImageSnapshot | null;
};
/** Item sub-object types */

export type ItemId = string;
export type ItemIdInit = ItemId | undefined;
export type ItemIdSnapshot = ItemId;
export type ItemIdDestructured = ItemId;
export type ItemContent = string;
export type ItemContentInit = ItemContent | undefined;
export type ItemContentSnapshot = ItemContent;
export type ItemContentDestructured = ItemContent;
export type ItemTags = ListEntity<ItemTagsInit, ItemTagsDestructured>;
export type ItemTagsInit = Array<ItemTagsItemInit>;
export type ItemTagsDestructured = Array<ItemTagsItem>;
export type ItemTagsSnapshot = Array<ItemTagsItemSnapshot>;
export type ItemTagsItem = string;
export type ItemTagsItemInit = ItemTagsItem;
export type ItemTagsItemSnapshot = ItemTagsItem;
export type ItemTagsItemDestructured = ItemTagsItem;
export type ItemPurchased = boolean;
export type ItemPurchasedInit = ItemPurchased | undefined;
export type ItemPurchasedSnapshot = ItemPurchased;
export type ItemPurchasedDestructured = ItemPurchased;
export type ItemCategoryId = string | null;
export type ItemCategoryIdInit = ItemCategoryId | undefined;
export type ItemCategoryIdSnapshot = ItemCategoryId;
export type ItemCategoryIdDestructured = ItemCategoryId;
export type ItemComments = ListEntity<
	ItemCommentsInit,
	ItemCommentsDestructured
>;
export type ItemCommentsInit = Array<ItemCommentsItemInit>;
export type ItemCommentsDestructured = Array<ItemCommentsItem>;
export type ItemCommentsSnapshot = Array<ItemCommentsItemSnapshot>;
export type ItemCommentsItem = ObjectEntity<
	ItemCommentsItemInit,
	ItemCommentsItemDestructured
>;
export type ItemCommentsItemInit = {
	id?: string;
	content?: string;
	authorId: string;
};
export type ItemCommentsItemDestructured = {
	id: string;
	content: string;
	authorId: string;
};
export type ItemCommentsItemSnapshot = {
	id: string;
	content: string;
	authorId: string;
};
export type ItemCommentsItemId = string;
export type ItemCommentsItemIdInit = ItemCommentsItemId | undefined;
export type ItemCommentsItemIdSnapshot = ItemCommentsItemId;
export type ItemCommentsItemIdDestructured = ItemCommentsItemId;
export type ItemCommentsItemContent = string;
export type ItemCommentsItemContentInit = ItemCommentsItemContent | undefined;
export type ItemCommentsItemContentSnapshot = ItemCommentsItemContent;
export type ItemCommentsItemContentDestructured = ItemCommentsItemContent;
export type ItemCommentsItemAuthorId = string;
export type ItemCommentsItemAuthorIdInit = ItemCommentsItemAuthorId;
export type ItemCommentsItemAuthorIdSnapshot = ItemCommentsItemAuthorId;
export type ItemCommentsItemAuthorIdDestructured = ItemCommentsItemAuthorId;

export type ItemImage = EntityFile;
export type ItemImageInit = File;
export type ItemImageDestructured = EntityFile;
export type ItemImageSnapshot = string;

export type Category = ObjectEntity<CategoryInit, CategoryDestructured>;

export interface CategoryNameMatchFilter {
	where: 'name';
	equals: string;
	order?: 'asc' | 'desc';
}

export interface CategoryNameRangeFilter {
	where: 'name';
	gte?: string;
	gt?: string;
	lte?: string;
	lt?: string;
	order?: 'asc' | 'desc';
}

export interface CategoryNameStartsWithFilter {
	where: 'name';
	startsWith: string;
	order?: 'asc' | 'desc';
}
export type CategoryFilter =
	| CategoryNameMatchFilter
	| CategoryNameRangeFilter
	| CategoryNameStartsWithFilter;

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

export type CategoryId = string;
export type CategoryIdInit = CategoryId | undefined;
export type CategoryIdSnapshot = CategoryId;
export type CategoryIdDestructured = CategoryId;
export type CategoryName = string;
export type CategoryNameInit = CategoryName;
export type CategoryNameSnapshot = CategoryName;
export type CategoryNameDestructured = CategoryName;
