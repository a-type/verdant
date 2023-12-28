import { StorageSchema } from "@verdant-web/common";
declare const schema: StorageSchema;
export default schema;

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
  id: string;
  type: string;
  size: PageAssetsValueSizeSnapshot;
  name: string | null;
  src: string | null;
};
export type PageAssetsSnapshot = { [key: string]: PageAssetsValueSnapshot };
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
  id: string;
  type: string;
  size?: PageAssetsValueSizeInit;
  name?: string | null;
  src?: string | null;
};
export type PageAssetsInit = { [key: string]: PageAssetsValueInit };

export type AssetSnapshot = { id: string; file: string };
export type AssetInit = { id: string; file: File };

export type MigrationTypes = {
  pages: { init: PageInit; snapshot: PageSnapshot };
  assets: { init: AssetInit; snapshot: AssetSnapshot };
};
