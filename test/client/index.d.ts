import type { StorageSchema } from "@lo-fi/common";
import type {
  Storage,
  StorageInitOptions,
  ObjectEntity,
  ListEntity,
  Query,
  ServerSync,
} from "@lo-fi/web";
export * from "@lo-fi/web";

import type schema from "./schema.js";
export type Schema = typeof schema;
export type Item = ObjectEntity<ItemInit, ItemDestructured>;

export interface ItemCategoryIdMatchFilter {
  where: "categoryId";
  equals: string | null;
  order?: "asc" | "desc";
}

export interface ItemCategoryIdRangeFilter {
  where: "categoryId";
  gte?: string | null;
  gt?: string | null;
  lte?: string | null;
  lt?: string | null;
  order?: "asc" | "desc";
}

export interface ItemCategoryIdStartsWithFilter {
  where: "categoryId";
  startsWith: string;
  order?: "asc" | "desc";
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
};
export type ItemInit = {
  id?: string;
  content?: string;
  tags?: ItemTagsInit;
  purchased?: boolean;
  categoryId?: string | null;
  comments?: ItemCommentsInit;
};
export type ItemSnapshot = {
  id: string;
  content: string;
  tags: ItemTagsSnapshot;
  purchased: boolean;
  categoryId: string | null;
  comments: ItemCommentsSnapshot;
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
export type ItemTags = ListEntity<ItemTagsInit, ItemTagsDestructured>;
export type ItemTagsInit = Array<ItemTagsItemInit>;
export type ItemTagsDestructured = Array<ItemTagsItem>;
export type ItemTagsSnapshot = Array<ItemTagsItemSnapshot>;
type ItemTagsItem = string;
type ItemTagsItemInit = ItemTagsItem;
type ItemTagsItemSnapshot = ItemTagsItem;
type ItemTagsItemDestructured = ItemTagsItem;
type ItemPurchased = boolean;
type ItemPurchasedInit = ItemPurchased | undefined;
type ItemPurchasedSnapshot = ItemPurchased;
type ItemPurchasedDestructured = ItemPurchased;
type ItemCategoryId = string | null;
type ItemCategoryIdInit = ItemCategoryId | undefined;
type ItemCategoryIdSnapshot = ItemCategoryId;
type ItemCategoryIdDestructured = ItemCategoryId;
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
type ItemCommentsItemId = string;
type ItemCommentsItemIdInit = ItemCommentsItemId | undefined;
type ItemCommentsItemIdSnapshot = ItemCommentsItemId;
type ItemCommentsItemIdDestructured = ItemCommentsItemId;
type ItemCommentsItemContent = string;
type ItemCommentsItemContentInit = ItemCommentsItemContent | undefined;
type ItemCommentsItemContentSnapshot = ItemCommentsItemContent;
type ItemCommentsItemContentDestructured = ItemCommentsItemContent;
type ItemCommentsItemAuthorId = string;
type ItemCommentsItemAuthorIdInit = ItemCommentsItemAuthorId;
type ItemCommentsItemAuthorIdSnapshot = ItemCommentsItemAuthorId;
type ItemCommentsItemAuthorIdDestructured = ItemCommentsItemAuthorId;

export type Category = ObjectEntity<CategoryInit, CategoryDestructured>;

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
  Filter
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
  undoHistory: Storage["undoHistory"];
  namespace: Storage["namespace"];
  entities: Storage["entities"];
  queryStore: Storage["queryStore"];

  close: Storage["close"];

  stats: () => Promise<any>;
}

// schema is provided internally. loadInitialData must be revised to pass the typed Client
interface ClientInitOptions<Presence = any, Profile = any>
  extends Omit<StorageInitOptions<Presence, Profile>, "schema"> {}

export class ClientDescriptor<Presence = any, Profile = any> {
  constructor(init: ClientInitOptions<Presence, Profile>);
  open: () => Promise<Client<Presence, Profile>>;
  readonly current: Client<Presence, Profile> | null;
  readonly readyPromise: Promise<Client<Presence, Profile>>;
  readonly schema: StorageSchema;
  readonly namespace: string;
  close: () => Promise<void>;
}
