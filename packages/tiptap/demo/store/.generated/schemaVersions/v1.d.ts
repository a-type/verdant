import { StorageSchema } from "@verdant-web/common";
declare const schema: StorageSchema;
export default schema;

export type PostSnapshot = {
  id: string;
  nullableBody: PostNullableBodySnapshot | null;
  requiredBody: PostRequiredBodySnapshot;
};

export type PostNullableBodyAttrsSnapshot = {
  [key: string]: PostNullableBodyAttrsValueSnapshot;
};
export type PostNullableBodyContentSnapshot = PostNullableBodySnapshot[];
export type PostNullableBodyMarksSnapshot = PostNullableBodySnapshot[];
export type PostNullableBodySnapshot = {
  type: string;
  from: number | null;
  to: number | null;
  attrs: PostNullableBodyAttrsSnapshot;
  content: PostNullableBodyContentSnapshot;
  text: string | null;
  marks: PostNullableBodyMarksSnapshot;
};
export type PostRequiredBodyAttrsSnapshot = {
  [key: string]: PostRequiredBodyAttrsValueSnapshot;
};
export type PostRequiredBodyContentSnapshot = PostRequiredBodySnapshot[];
export type PostRequiredBodyMarksSnapshot = PostRequiredBodySnapshot[];
export type PostRequiredBodySnapshot = {
  type: string;
  from: number | null;
  to: number | null;
  attrs: PostRequiredBodyAttrsSnapshot;
  content: PostRequiredBodyContentSnapshot;
  text: string | null;
  marks: PostRequiredBodyMarksSnapshot;
};
export type PostInit = {
  id?: string;
  nullableBody?: PostNullableBodyInit | null;
  requiredBody?: PostRequiredBodyInit;
};

export type PostNullableBodyAttrsInit = {
  [key: string]: PostNullableBodyAttrsValueInit;
};
export type PostNullableBodyContentInit = PostNullableBodyInit[];
export type PostNullableBodyMarksInit = PostNullableBodyInit[];
export type PostNullableBodyInit = {
  type: string;
  from?: number | null;
  to?: number | null;
  attrs?: PostNullableBodyAttrsInit;
  content?: PostNullableBodyContentInit;
  text?: string | null;
  marks?: PostNullableBodyMarksInit;
};
export type PostRequiredBodyAttrsInit = {
  [key: string]: PostRequiredBodyAttrsValueInit;
};
export type PostRequiredBodyContentInit = PostRequiredBodyInit[];
export type PostRequiredBodyMarksInit = PostRequiredBodyInit[];
export type PostRequiredBodyInit = {
  type: string;
  from?: number | null;
  to?: number | null;
  attrs?: PostRequiredBodyAttrsInit;
  content?: PostRequiredBodyContentInit;
  text?: string | null;
  marks?: PostRequiredBodyMarksInit;
};

export type MigrationTypes = {
  posts: { init: PostInit; snapshot: PostSnapshot };
};
