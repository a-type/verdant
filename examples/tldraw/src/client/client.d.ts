/** Generated types for Verdant client */
import type {
  Client as BaseClient,
  ClientDescriptor as BaseClientDescriptor,
  ClientDescriptorOptions as BaseClientDescriptorOptions,
  CollectionQueries,
  StorageSchema,
  Migration,
  EntityFile,
} from "@verdant-web/store";
export * from "@verdant-web/store";

export class Client<Presence = any, Profile = any> {
  readonly pages: CollectionQueries<Page, PageInit, PageFilter>;
  readonly assets: CollectionQueries<Asset, AssetInit, AssetFilter>;

  sync: BaseClient<Presence, Profile>["sync"];
  undoHistory: BaseClient<Presence, Profile>["undoHistory"];
  namespace: BaseClient<Presence, Profile>["namespace"];
  entities: BaseClient<Presence, Profile>["entities"];
  queryStore: BaseClient<Presence, Profile>["queryStore"];
  batch: BaseClient<Presence, Profile>["batch"];
  files: BaseClient<Presence, Profile>["files"];
  close: BaseClient<Presence, Profile>["close"];
  export: BaseClient<Presence, Profile>["export"];
  import: BaseClient<Presence, Profile>["import"];
  subscribe: BaseClient<Presence, Profile>["on"];
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
  constructor(init: ClientInitOptions<Presence, Profile>);
  open: () => Promise<Client<Presence, Profile>>;
  close: () => Promise<void>;
  readonly current: Client<Presence, Profile> | null;
  readonly readyPromise: Promise<Client<Presence, Profile>>;
  readonly schema: StorageSchema;
  readonly namespace: string;
}

import { ObjectEntity, ListEntity, EntityFile } from "@verdant-web/store";

/** Generated types for Page */

export type Page = ObjectEntity<PageInit, PageDestructured, PageSnapshot>;
export type PageId = string;
export type PageVersion = number;
export type PageShapes = ObjectEntity<
  PageShapesInit,
  PageShapesDestructured,
  PageShapesSnapshot
>;
export type PageShapesValue = any;
export type PageBindings = ObjectEntity<
  PageBindingsInit,
  PageBindingsDestructured,
  PageBindingsSnapshot
>;
export type PageBindingsValue = any;
export type PageAssets = ObjectEntity<
  PageAssetsInit,
  PageAssetsDestructured,
  PageAssetsSnapshot
>;
export type PageAssetsValue = ObjectEntity<
  PageAssetsValueInit,
  PageAssetsValueDestructured,
  PageAssetsValueSnapshot
>;
export type PageAssetsValueType = string;
export type PageAssetsValueSize = ListEntity<
  PageAssetsValueSizeInit,
  PageAssetsValueSizeDestructured,
  PageAssetsValueSizeSnapshot
>;
export type PageAssetsValueSizeItem = number;
export type PageInit = {
  id?: string;
  version: number;
  shapes?: PageShapesInit;
  bindings?: PageBindingsInit;
  assets?: PageAssetsInit;
};

export type PageShapesInit = { [key: string]: PageShapesValueInit };
export type PageBindingsInit = { [key: string]: PageBindingsValueInit };
export type PageAssetsValueSizeInit = number[];
export type PageAssetsValueInit = {
  type: string;
  size?: PageAssetsValueSizeInit;
};
export type PageAssetsInit = { [key: string]: PageAssetsValueInit };
export type PageDestructured = {
  id: string;
  version: number;
  shapes: PageShapes;
  bindings: PageBindings;
  assets: PageAssets;
};

export type PageShapesDestructured = {
  [key: string]: PageShapesValue | undefined;
};
export type PageBindingsDestructured = {
  [key: string]: PageBindingsValue | undefined;
};
export type PageAssetsValueSizeDestructured = number[];
export type PageAssetsValueDestructured = {
  type: string;
  size: PageAssetsValueSize;
};
export type PageAssetsDestructured = {
  [key: string]: PageAssetsValue | undefined;
};
export type PageSnapshot = {
  id: string;
  version: number;
  shapes: PageShapesSnapshot;
  bindings: PageBindingsSnapshot;
  assets: PageAssetsSnapshot;
};

export type PageShapesSnapshot = { [key: string]: PageShapesValueSnapshot };
export type PageBindingsSnapshot = { [key: string]: PageBindingsValueSnapshot };
export type PageAssetsValueSizeSnapshot = number[];
export type PageAssetsValueSnapshot = {
  type: string;
  size: PageAssetsValueSizeSnapshot;
};
export type PageAssetsSnapshot = { [key: string]: PageAssetsValueSnapshot };

/** Index filters for Page **/

export type PageFilter = never;

/** Generated types for Asset */

export type Asset = ObjectEntity<AssetInit, AssetDestructured, AssetSnapshot>;
export type AssetId = string;
export type AssetFile = string;
export type AssetInit = { id: string; file: File };

export type AssetDestructured = { id: string; file: EntityFile };

export type AssetSnapshot = { id: string; file: string };

/** Index filters for Asset **/

export type AssetFilter = never;
