import { StorageSchema } from "@verdant-web/common";
declare const schema: StorageSchema;
export default schema;

export type PostSnapshot = {
  id: string;
  nullableBody: PostNullableBodySnapshot | null;
  requiredBody: PostRequiredBodySnapshot;
  files: PostFilesSnapshot;
};

export type PostNullableBodyAttrsSnapshot = {
  [key: string]: PostNullableBodyAttrsValueSnapshot;
};
export type PostNullableBodyContentItemAttrsSnapshot = {
  [key: string]: PostNullableBodyContentItemAttrsValueSnapshot;
};
export type PostNullableBodyContentItemContentSnapshot =
  | PostNullableBodyContentSnapshot[]
  | null;
export type PostNullableBodyContentItemMarksSnapshot =
  | PostNullableBodyContentSnapshot[]
  | null;
export type PostNullableBodyContentItemSnapshot = {
  type: string;
  from: number | null;
  to: number | null;
  attrs: PostNullableBodyContentItemAttrsSnapshot;
  content: PostNullableBodyContentItemContentSnapshot | null;
  text: string | null;
  marks: PostNullableBodyContentItemMarksSnapshot | null;
};
export type PostNullableBodyContentSnapshot =
  | PostNullableBodyContentItemSnapshot[]
  | null;
export type PostNullableBodyMarksSnapshot =
  | PostNullableBodyContentSnapshot[]
  | null;
export type PostNullableBodySnapshot = {
  type: string;
  from: number | null;
  to: number | null;
  attrs: PostNullableBodyAttrsSnapshot;
  content: PostNullableBodyContentSnapshot | null;
  text: string | null;
  marks: PostNullableBodyMarksSnapshot | null;
};
export type PostRequiredBodyAttrsSnapshot = {
  [key: string]: PostRequiredBodyAttrsValueSnapshot;
};
export type PostRequiredBodyContentItemAttrsSnapshot = {
  [key: string]: PostRequiredBodyContentItemAttrsValueSnapshot;
};
export type PostRequiredBodyContentItemContentSnapshot =
  | PostRequiredBodyContentSnapshot[]
  | null;
export type PostRequiredBodyContentItemMarksSnapshot =
  | PostRequiredBodyContentSnapshot[]
  | null;
export type PostRequiredBodyContentItemSnapshot = {
  type: string;
  from: number | null;
  to: number | null;
  attrs: PostRequiredBodyContentItemAttrsSnapshot;
  content: PostRequiredBodyContentItemContentSnapshot | null;
  text: string | null;
  marks: PostRequiredBodyContentItemMarksSnapshot | null;
};
export type PostRequiredBodyContentSnapshot =
  | PostRequiredBodyContentItemSnapshot[]
  | null;
export type PostRequiredBodyMarksSnapshot =
  | PostRequiredBodyContentSnapshot[]
  | null;
export type PostRequiredBodySnapshot = {
  type: string;
  from: number | null;
  to: number | null;
  attrs: PostRequiredBodyAttrsSnapshot;
  content: PostRequiredBodyContentSnapshot | null;
  text: string | null;
  marks: PostRequiredBodyMarksSnapshot | null;
};
export type PostFilesSnapshot = { [key: string]: PostFilesValueSnapshot };
export type PostInit = {
  id?: string;
  nullableBody?: PostNullableBodyInit | null;
  requiredBody?: PostRequiredBodyInit;
  files?: PostFilesInit;
};

export type PostNullableBodyAttrsInit = {
  [key: string]: PostNullableBodyAttrsValueInit;
};
export type PostNullableBodyContentItemAttrsInit = {
  [key: string]: PostNullableBodyContentItemAttrsValueInit;
};
export type PostNullableBodyContentItemContentInit =
  | PostNullableBodyContentInit[]
  | null;
export type PostNullableBodyContentItemMarksInit =
  | PostNullableBodyContentInit[]
  | null;
export type PostNullableBodyContentItemInit = {
  type: string;
  from?: number | null;
  to?: number | null;
  attrs?: PostNullableBodyContentItemAttrsInit;
  content?: PostNullableBodyContentItemContentInit | null;
  text?: string | null;
  marks?: PostNullableBodyContentItemMarksInit | null;
};
export type PostNullableBodyContentInit =
  | PostNullableBodyContentItemInit[]
  | null;
export type PostNullableBodyMarksInit = PostNullableBodyContentInit[] | null;
export type PostNullableBodyInit = {
  type: string;
  from?: number | null;
  to?: number | null;
  attrs?: PostNullableBodyAttrsInit;
  content?: PostNullableBodyContentInit | null;
  text?: string | null;
  marks?: PostNullableBodyMarksInit | null;
};
export type PostRequiredBodyAttrsInit = {
  [key: string]: PostRequiredBodyAttrsValueInit;
};
export type PostRequiredBodyContentItemAttrsInit = {
  [key: string]: PostRequiredBodyContentItemAttrsValueInit;
};
export type PostRequiredBodyContentItemContentInit =
  | PostRequiredBodyContentInit[]
  | null;
export type PostRequiredBodyContentItemMarksInit =
  | PostRequiredBodyContentInit[]
  | null;
export type PostRequiredBodyContentItemInit = {
  type: string;
  from?: number | null;
  to?: number | null;
  attrs?: PostRequiredBodyContentItemAttrsInit;
  content?: PostRequiredBodyContentItemContentInit | null;
  text?: string | null;
  marks?: PostRequiredBodyContentItemMarksInit | null;
};
export type PostRequiredBodyContentInit =
  | PostRequiredBodyContentItemInit[]
  | null;
export type PostRequiredBodyMarksInit = PostRequiredBodyContentInit[] | null;
export type PostRequiredBodyInit = {
  type: string;
  from?: number | null;
  to?: number | null;
  attrs?: PostRequiredBodyAttrsInit;
  content?: PostRequiredBodyContentInit | null;
  text?: string | null;
  marks?: PostRequiredBodyMarksInit | null;
};
export type PostFilesInit = { [key: string]: PostFilesValueInit };

export type MigrationTypes = {
  posts: { init: PostInit; snapshot: PostSnapshot };
};
