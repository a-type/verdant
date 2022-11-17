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
export interface PageSnapshot {
  id: string;
  version: number;
  shapes: Record<string, any>;
  bindings: Record<string, any>;
  assets: Record<string, any>;
}

export interface PageInit {
  id?: string;
  version: number;
  shapes?: Record<string, any>;
  bindings?: Record<string, any>;
  assets?: Record<string, any>;
}
export type Page = ObjectEntity<PageInit>;

export type PageShapesValue = ObjectEntity<Record<string, Record<string, any>>>;

export type PageBindingsValue = ObjectEntity<
  Record<string, Record<string, any>>
>;

export type PageAssetsValue = ObjectEntity<Record<string, Record<string, any>>>;

export type PageFilter = never;

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

export class Client {
  readonly pages: Collection<Page, PageSnapshot, PageInit, PageFilter>;

  presence: Storage["sync"]["presence"];
  sync: Storage["sync"];
  undoHistory: Storage["undoHistory"];
  namespace: Storage["namespace"];
  entities: Storage["entities"];
  queryStore: Storage["queryStore"];

  close: Storage["close"];

  stats: () => Promise<any>;
}

// schema is provided internally. loadInitialData must be revised to pass the typed Client
interface ClientInitOptions
  extends Omit<StorageInitOptions, "schema" | "loadInitialData"> {
  loadInitialData?: (client: Client) => Promise<void>;
}

export class ClientDescriptor {
  constructor(init: ClientInitOptions);
  open: () => Promise<Client>;
  readonly current: Client | null;
  readonly readyPromise: Promise<Client>;
  readonly schema: StorageSchema;
  readonly namespace: string;
  close: () => Promise<void>;
}
