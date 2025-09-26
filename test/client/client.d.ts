/** Generated types for Verdant client */
import type {
  Client as BaseClient,
  ClientDescriptor as BaseClientDescriptor,
  ClientDescriptorOptions as BaseClientDescriptorOptions,
  CollectionQueries,
  StorageSchema,
  Migration,
} from "@verdant-web/store";
export * from "@verdant-web/store";

export class Client<Presence = any, Profile = any> {
  /** Collection access for Item. Load queries, put and delete documents. */
  readonly items: CollectionQueries<Item, ItemInit, ItemFilter>;

  /** Collection access for Category. Load queries, put and delete documents. */
  readonly categories: CollectionQueries<
    Category,
    CategoryInit,
    CategoryFilter
  >;

  /**
   * Turn on and off sync, or adjust the sync protocol and other settings.
   */
  sync: BaseClient<Presence, Profile>["sync"];
  /**
   * Access and manipulate the undo/redo stack. You can also
   * add custom undoable actions using addUndo, although the interface
   * for doing this is pretty mind-bending at the moment (sorry).
   */
  undoHistory: BaseClient<Presence, Profile>["undoHistory"];
  /**
   * The namespace used to construct this store.
   */
  namespace: BaseClient<Presence, Profile>["namespace"];
  /**
   * @deprecated - do not use this. For batching, use .batch instead.
   * Using methods on this property can cause data loss and corruption.
   */
  entities: BaseClient<Presence, Profile>["entities"];
  /**
   * Tools for batching operations so they are bundled together
   * in the undo/redo stack.
   */
  batch: BaseClient<Presence, Profile>["batch"];
  close: BaseClient<Presence, Profile>["close"];
  /**
   * Export a backup of a full library
   */
  export: BaseClient<Presence, Profile>["export"];
  /**
   * Import a full library from a backup. WARNING: this replaces
   * existing data with no option for restore.
   */
  import: BaseClient<Presence, Profile>["import"];
  /**
   * Subscribe to global store events
   */
  subscribe: BaseClient<Presence, Profile>["subscribe"];
  /**
   * Read stats about storage usage
   */
  stats: BaseClient<Presence, Profile>["stats"];
  /**
   * An interface for inspecting and manipulating active live queries.
   * Particularly, see .keepAlive and .dropKeepAlive for placing keep-alive
   * holds to keep query results in memory when unsubscribed.
   */
  queries: BaseClient<Presence, Profile>["queries"];

  /**
   * Get the local replica ID for this client instance.
   * Not generally useful for people besides me.
   */
  getReplicaId: BaseClient<Presence, Profile>["getReplicaId"];

  /**
   * Deletes all local data. If the client is connected to sync,
   * this will cause the client to re-sync all data from the server.
   * Use this very carefully, and only as a last resort.
   */
  __dangerous__resetLocal: BaseClient<
    Presence,
    Profile
  >["__dangerous__resetLocal"];

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
  __dangerous__hardReset: () => Promise<void>;

  /**
   * Manually triggers storage rebasing. Follows normal
   * rebasing rules. Rebases already happen automatically
   * during normal operation, so you probably don't need this.
   */
  __manualRebase: () => Promise<void>;
}

export interface ClientDescriptorOptions<Presence = any, Profile = any>
  extends Omit<
    BaseClientDescriptorOptions<Presence, Profile>,
    "schema" | "migrations" | "oldSchemas"
  > {
  /** WARNING: overriding the schema is dangerous and almost definitely not what you want. */
  schema?: StorageSchema;
  /** WARNING: overriding old schemas is dangerous and almost definitely not what you want. */
  oldSchemas?: StorageSchema[];
  /** WARNING: overriding the migrations is dangerous and almost definitely not what you want. */
  migrations?: Migration[];
}

export class ClientDescriptor<Presence = any, Profile = any> {
  constructor(init: ClientDescriptorOptions<Presence, Profile>);
  open: () => Promise<Client<Presence, Profile>>;
  close: () => Promise<void>;
  readonly current: Client<Presence, Profile> | null;
  readonly readyPromise: Promise<Client<Presence, Profile>>;
  readonly schema: StorageSchema;
  readonly namespace: string;
  /**
   * Resets all local data for this client, including the schema and migrations.
   * If the client is not connected to sync, this causes the irretrievable loss of all data.
   * If the client is connected to sync, this will cause the client to re-sync all data from the server.
   * Use this very carefully, and only as a last resort.
   */
  __dangerous__resetLocal: () => Promise<void>;
}

import {
  ObjectEntity,
  ListEntity,
  EntityFile,
  EntityFileSnapshot,
} from "@verdant-web/store";

/** Generated types for Item */

export type Item = ObjectEntity<ItemInit, ItemDestructured, ItemSnapshot>;
export type ItemId = string;
export type ItemContent = string;
export type ItemTags = ListEntity<
  ItemTagsInit,
  ItemTagsDestructured,
  ItemTagsSnapshot
>;
export type ItemTagsItem = "a" | "b" | "c";
export type ItemPurchased = boolean;
export type ItemCategoryId = string;
export type ItemComments = ListEntity<
  ItemCommentsInit,
  ItemCommentsDestructured,
  ItemCommentsSnapshot
>;
export type ItemCommentsItem = ObjectEntity<
  ItemCommentsItemInit,
  ItemCommentsItemDestructured,
  ItemCommentsItemSnapshot
>;
export type ItemCommentsItemId = string;
export type ItemCommentsItemContent = string;
export type ItemCommentsItemAuthorId = string;
export type ItemImage = EntityFile;
export type ItemInit = {
  id?: string;
  content?: string;
  tags?: ItemTagsInit;
  purchased?: boolean;
  categoryId?: string | null;
  comments?: ItemCommentsInit;
  image?: File | null;
};

export type ItemTagsInit = ("a" | "b" | "c")[];
export type ItemCommentsItemInit = {
  id?: string;
  content?: string;
  authorId: string;
};
export type ItemCommentsInit = ItemCommentsItemInit[];
export type ItemDestructured = {
  id: string;
  content: string;
  tags: ItemTags;
  purchased: boolean;
  categoryId: string | null;
  comments: ItemComments;
  image: EntityFile | null;
};

export type ItemTagsDestructured = ("a" | "b" | "c")[];
export type ItemCommentsItemDestructured = {
  id: string;
  content: string;
  authorId: string;
};
export type ItemCommentsDestructured = ItemCommentsItem[];
export type ItemSnapshot = {
  id: string;
  content: string;
  tags: ItemTagsSnapshot;
  purchased: boolean;
  categoryId: string | null;
  comments: ItemCommentsSnapshot;
  image: EntityFileSnapshot | null;
};

export type ItemTagsSnapshot = ("a" | "b" | "c")[];
export type ItemCommentsItemSnapshot = {
  id: string;
  content: string;
  authorId: string;
};
export type ItemCommentsSnapshot = ItemCommentsItemSnapshot[];

/** Index filters for Item **/

export interface ItemCategoryIdSortFilter {
  where: "categoryId";
  order: "asc" | "desc";
}
export interface ItemCategoryIdMatchFilter {
  where: "categoryId";
  equals: string;
  order?: "asc" | "desc";
}
export interface ItemCategoryIdRangeFilter {
  where: "categoryId";
  gte?: string;
  gt?: string;
  lte?: string;
  lt?: string;
  order?: "asc" | "desc";
}
export interface ItemCategoryIdStartsWithFilter {
  where: "categoryId";
  startsWith: string;
  order?: "asc" | "desc";
}
export interface ItemPurchasedYesNoSortFilter {
  where: "purchasedYesNo";
  order: "asc" | "desc";
}
export interface ItemPurchasedYesNoMatchFilter {
  where: "purchasedYesNo";
  equals: string;
  order?: "asc" | "desc";
}
export interface ItemPurchasedYesNoRangeFilter {
  where: "purchasedYesNo";
  gte?: string;
  gt?: string;
  lte?: string;
  lt?: string;
  order?: "asc" | "desc";
}
export interface ItemPurchasedYesNoStartsWithFilter {
  where: "purchasedYesNo";
  startsWith: string;
  order?: "asc" | "desc";
}
export type ItemFilter =
  | ItemCategoryIdSortFilter
  | ItemCategoryIdMatchFilter
  | ItemCategoryIdRangeFilter
  | ItemCategoryIdStartsWithFilter
  | ItemPurchasedYesNoSortFilter
  | ItemPurchasedYesNoMatchFilter
  | ItemPurchasedYesNoRangeFilter
  | ItemPurchasedYesNoStartsWithFilter;

/** Generated types for Category */

export type Category = ObjectEntity<
  CategoryInit,
  CategoryDestructured,
  CategorySnapshot
>;
export type CategoryId = string;
export type CategoryName = string;
export type CategoryMetadata = ObjectEntity<
  CategoryMetadataInit,
  CategoryMetadataDestructured,
  CategoryMetadataSnapshot
>;
export type CategoryMetadataColor = string;
export type CategoryInit = {
  id?: string;
  name: string;
  metadata?: CategoryMetadataInit | null;
};

export type CategoryMetadataInit = { color: string };
export type CategoryDestructured = {
  id: string;
  name: string;
  metadata: CategoryMetadata | null;
};

export type CategoryMetadataDestructured = { color: string };
export type CategorySnapshot = {
  id: string;
  name: string;
  metadata: CategoryMetadataSnapshot | null;
};

export type CategoryMetadataSnapshot = { color: string };

/** Index filters for Category **/

export interface CategoryNameSortFilter {
  where: "name";
  order: "asc" | "desc";
}
export interface CategoryNameMatchFilter {
  where: "name";
  equals: string;
  order?: "asc" | "desc";
}
export interface CategoryNameRangeFilter {
  where: "name";
  gte?: string;
  gt?: string;
  lte?: string;
  lt?: string;
  order?: "asc" | "desc";
}
export interface CategoryNameStartsWithFilter {
  where: "name";
  startsWith: string;
  order?: "asc" | "desc";
}
export type CategoryFilter =
  | CategoryNameSortFilter
  | CategoryNameMatchFilter
  | CategoryNameRangeFilter
  | CategoryNameStartsWithFilter;
