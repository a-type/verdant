import { StorageSchema } from "@verdant-web/common";
declare const schema: StorageSchema;
export default schema;

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

export type CategorySnapshot = {
  id: string;
  name: string;
  metadata: CategoryMetadataSnapshot | null;
};

export type CategoryMetadataSnapshot = { color: string };
export type CategoryInit = {
  id?: string;
  name: string;
  metadata?: CategoryMetadataInit | null;
};

export type CategoryMetadataInit = { color: string };

export type MigrationTypes = {
  items: { init: ItemInit; snapshot: ItemSnapshot };
  categories: { init: CategoryInit; snapshot: CategorySnapshot };
};
