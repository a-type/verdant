import type { StorageSchema } from "@lo-fi/common";
import type {
  Storage,
  StorageInitOptions,
  ObjectEntity,
  ListEntity,
  Query,
} from "@lo-fi/web";
export * from "@lo-fi/web";

import type schema from "./schema.js";
export type Schema = typeof schema;
export interface ItemSnapshot {
  id: string;
  content: string;
  tags: Array<string>;
  purchased: boolean;
  categoryId: string | null;
  comments: Array<{
    id: string;
    content: string;
    authorId: string;
  }>;
}

export interface ItemInit {
  id?: string;
  content?: string;
  tags?: Array<string>;
  purchased?: boolean;
  categoryId?: string | null;
  comments?: Array<{
    id?: string;
    content?: string;
    authorId: string;
  }>;
}
export type Item = ObjectEntity<ItemInit>;

export type ItemTags = ListEntity<string>;

export type ItemComments = ListEntity<{
  id: string;
  content: string;
  authorId: string;
}>;

export type ItemCommentsItem = ObjectEntity<{
  id: string;
  content: string;
  authorId: string;
}>;

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

export type ItemFilter = ItemCategoryIdMatchFilter | ItemCategoryIdRangeFilter;

export interface CategorySnapshot {
  id: string;
  name: string;
}

export interface CategoryInit {
  id?: string;
  name: string;
}
export type Category = ObjectEntity<CategoryInit>;

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

export type CategoryFilter = CategoryNameMatchFilter | CategoryNameRangeFilter;

interface Collection<
  Document extends ObjectEntity<any>,
  Snapshot,
  Init,
  Filter
> {
  create: (init: Init) => Promise<Document>;
  upsert: (init: Init) => Promise<Document>;
  delete: (id: string) => Promise<void>;
  deleteAll: (ids: string[]) => Promise<void>;
  get: (id: string) => Query<Document>;
  findOne: (filter: Filter) => Query<Document>;
  findAll: (filter?: Filter) => Query<Document[]>;
}

export class Client {
  readonly items: Collection<Item, ItemSnapshot, ItemInit, ItemFilter>;

  readonly categories: Collection<
    Category,
    CategorySnapshot,
    CategoryInit,
    CategoryFilter
  >;

  presence: Storage["sync"]["presence"];
  sync: Storage["sync"];
  undoHistory: Storage["undoHistory"];
  namespace: Storage["namespace"];
  entities: Storage["entities"];
  queryStore: Storage["queryStore"];

  close: Storage["close"];

  stats: () => Promise<any>;
}

export class ClientDescriptor {
  constructor(init: Omit<StorageInitOptions<Schema>, "schema">);
  open: () => Promise<Client>;
  readonly current: Client | null;
  readonly readyPromise: Promise<Client>;
  readonly schema: StorageSchema;
  readonly namespace: string;
  close: () => Promise<void>;
}
