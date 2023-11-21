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
  readonly items: CollectionQueries<Item, ItemInit, ItemFilter>;
  readonly categories: CollectionQueries<
    Category,
    CategoryInit,
    CategoryFilter
  >;

  sync: BaseClient<Presence, Profile>["sync"];
  undoHistory: BaseClient<Presence, Profile>["undoHistory"];
  namespace: BaseClient<Presence, Profile>["namespace"];
  entities: BaseClient<Presence, Profile>["entities"];
  // queryStore: BaseClient<Presence, Profile>['queryStore'];
  batch: BaseClient<Presence, Profile>["batch"];
  // files: BaseClient<Presence, Profile>['files'];
  close: BaseClient<Presence, Profile>["close"];
  export: BaseClient<Presence, Profile>["export"];
  import: BaseClient<Presence, Profile>["import"];
  subscribe: BaseClient<Presence, Profile>["subscribe"];
  stats: BaseClient<Presence, Profile>["stats"];
  __dangerous__resetLocal: BaseClient<
    Presence,
    Profile
  >["__dangerous__resetLocal"];
}

export interface ClientDescriptorOptions<Presence = any, Profile = any>
  extends Omit<
    BaseClientDescriptorOptions<Presence, Profile>,
    "schema" | "migrations"
  > {
  /** WARNING: overriding the schema is dangerous and almost definitely not what you want. */
  schema?: StorageSchema;
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
}

import { ObjectEntity, ListEntity, EntityFile } from "@verdant-web/store";

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
export type ItemImage = string | null;
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
  image: string | null;
};

export type ItemTagsSnapshot = ("a" | "b" | "c")[];
export type ItemCommentsItemSnapshot = {
  id: string;
  content: string;
  authorId: string;
};
export type ItemCommentsSnapshot = ItemCommentsItemSnapshot[];

/** Index filters for Item **/

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
export type ItemFilter =
  | ItemCategoryIdMatchFilter
  | ItemCategoryIdRangeFilter
  | ItemCategoryIdStartsWithFilter
  | ItemPurchasedYesNoMatchFilter
  | ItemPurchasedYesNoRangeFilter
  | ItemPurchasedYesNoStartsWithFilter
  | ItemCategoryIdMatchFilter
  | ItemCategoryIdRangeFilter
  | ItemCategoryIdStartsWithFilter;

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
> | null;
export type CategoryMetadataColor = string;
export type CategoryInit = {
  id?: string;
  name: string;
  metadata?: CategoryMetadataInit;
};

export type CategoryMetadataInit = { color: string } | null;
export type CategoryDestructured = {
  id: string;
  name: string;
  metadata: CategoryMetadata;
};

export type CategoryMetadataDestructured = { color: string };
export type CategorySnapshot = {
  id: string;
  name: string;
  metadata: CategoryMetadataSnapshot;
};

export type CategoryMetadataSnapshot = { color: string } | null;

/** Index filters for Category **/

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
  | CategoryNameStartsWithFilter
  | CategoryNameMatchFilter
  | CategoryNameRangeFilter
  | CategoryNameStartsWithFilter;
