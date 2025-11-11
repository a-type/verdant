/** Generated types for Verdant client */
import type {
  Client as BaseClient,
  ClientInitOptions as BaseClientInitOptions,
  CollectionQueries,
  StorageSchema,
  Migration,
} from "@verdant-web/store";
export * from "@verdant-web/store";

export class Client<Presence = any, Profile = any> {
  /** Collection access for Post. Load queries, put and delete documents. */
  readonly posts: CollectionQueries<Post, PostInit, PostFilter>;

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

  constructor(init: ClientInitOptions<Presence, Profile>);
}

export interface ClientInitOptions<Presence = any, Profile = any>
  extends Omit<
    BaseClientInitOptions<Presence, Profile>,
    "schema" | "migrations" | "oldSchemas"
  > {
  /** WARNING: overriding the schema is dangerous and almost definitely not what you want. */
  schema?: StorageSchema;
  /** WARNING: overriding old schemas is dangerous and almost definitely not what you want. */
  oldSchemas?: StorageSchema[];
  /** WARNING: overriding the migrations is dangerous and almost definitely not what you want. */
  migrations?: Migration[];
}

import {
  ObjectEntity,
  ListEntity,
  EntityFile,
  EntityFileSnapshot,
} from "@verdant-web/store";

/** Generated types for Post */

export type Post = ObjectEntity<PostInit, PostDestructured, PostSnapshot>;
export type PostId = string;
export type PostNullableBody = ObjectEntity<
  PostNullableBodyInit,
  PostNullableBodyDestructured,
  PostNullableBodySnapshot
>;
export type PostNullableBodyType = string;
export type PostNullableBodyFrom = number;
export type PostNullableBodyTo = number;
export type PostNullableBodyAttrs = ObjectEntity<
  PostNullableBodyAttrsInit,
  PostNullableBodyAttrsDestructured,
  PostNullableBodyAttrsSnapshot
>;
export type PostNullableBodyAttrsValue = any;
export type PostNullableBodyContent = ListEntity<
  PostNullableBodyContentInit,
  PostNullableBodyContentDestructured,
  PostNullableBodyContentSnapshot
>;
export type PostNullableBodyContentItem = ObjectEntity<
  PostNullableBodyContentItemInit,
  PostNullableBodyContentItemDestructured,
  PostNullableBodyContentItemSnapshot
>;
export type PostNullableBodyContentItemType = string;
export type PostNullableBodyContentItemFrom = number;
export type PostNullableBodyContentItemTo = number;
export type PostNullableBodyContentItemAttrs = ObjectEntity<
  PostNullableBodyContentItemAttrsInit,
  PostNullableBodyContentItemAttrsDestructured,
  PostNullableBodyContentItemAttrsSnapshot
>;
export type PostNullableBodyContentItemAttrsValue = any;
export type PostNullableBodyContentItemContent = ListEntity<
  PostNullableBodyContentItemContentInit,
  PostNullableBodyContentItemContentDestructured,
  PostNullableBodyContentItemContentSnapshot
>;

export type PostNullableBodyContentItemText = string;
export type PostNullableBodyContentItemMarks = ListEntity<
  PostNullableBodyContentItemMarksInit,
  PostNullableBodyContentItemMarksDestructured,
  PostNullableBodyContentItemMarksSnapshot
>;

export type PostNullableBodyText = string;
export type PostNullableBodyMarks = ListEntity<
  PostNullableBodyMarksInit,
  PostNullableBodyMarksDestructured,
  PostNullableBodyMarksSnapshot
>;
export type PostRequiredBody = ObjectEntity<
  PostRequiredBodyInit,
  PostRequiredBodyDestructured,
  PostRequiredBodySnapshot
>;
export type PostRequiredBodyType = string;
export type PostRequiredBodyFrom = number;
export type PostRequiredBodyTo = number;
export type PostRequiredBodyAttrs = ObjectEntity<
  PostRequiredBodyAttrsInit,
  PostRequiredBodyAttrsDestructured,
  PostRequiredBodyAttrsSnapshot
>;
export type PostRequiredBodyAttrsValue = any;
export type PostRequiredBodyContent = ListEntity<
  PostRequiredBodyContentInit,
  PostRequiredBodyContentDestructured,
  PostRequiredBodyContentSnapshot
>;
export type PostRequiredBodyContentItem = ObjectEntity<
  PostRequiredBodyContentItemInit,
  PostRequiredBodyContentItemDestructured,
  PostRequiredBodyContentItemSnapshot
>;
export type PostRequiredBodyContentItemType = string;
export type PostRequiredBodyContentItemFrom = number;
export type PostRequiredBodyContentItemTo = number;
export type PostRequiredBodyContentItemAttrs = ObjectEntity<
  PostRequiredBodyContentItemAttrsInit,
  PostRequiredBodyContentItemAttrsDestructured,
  PostRequiredBodyContentItemAttrsSnapshot
>;
export type PostRequiredBodyContentItemAttrsValue = any;
export type PostRequiredBodyContentItemContent = ListEntity<
  PostRequiredBodyContentItemContentInit,
  PostRequiredBodyContentItemContentDestructured,
  PostRequiredBodyContentItemContentSnapshot
>;

export type PostRequiredBodyContentItemText = string;
export type PostRequiredBodyContentItemMarks = ListEntity<
  PostRequiredBodyContentItemMarksInit,
  PostRequiredBodyContentItemMarksDestructured,
  PostRequiredBodyContentItemMarksSnapshot
>;

export type PostRequiredBodyText = string;
export type PostRequiredBodyMarks = ListEntity<
  PostRequiredBodyMarksInit,
  PostRequiredBodyMarksDestructured,
  PostRequiredBodyMarksSnapshot
>;
export type PostFiles = ObjectEntity<
  PostFilesInit,
  PostFilesDestructured,
  PostFilesSnapshot
>;
export type PostFilesValue = EntityFile;
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
export type PostDestructured = {
  id: string;
  nullableBody: PostNullableBody | null;
  requiredBody: PostRequiredBody;
  files: PostFiles;
};

export type PostNullableBodyAttrsDestructured = {
  [key: string]: PostNullableBodyAttrsValue | undefined;
};
export type PostNullableBodyContentItemAttrsDestructured = {
  [key: string]: PostNullableBodyContentItemAttrsValue | undefined;
};
export type PostNullableBodyContentItemContentDestructured =
  PostNullableBodyContent[];
export type PostNullableBodyContentItemMarksDestructured =
  PostNullableBodyContent[];
export type PostNullableBodyContentItemDestructured = {
  type: string;
  from: number | null;
  to: number | null;
  attrs: PostNullableBodyContentItemAttrs;
  content: PostNullableBodyContentItemContent | null;
  text: string | null;
  marks: PostNullableBodyContentItemMarks | null;
};
export type PostNullableBodyContentDestructured = PostNullableBodyContentItem[];
export type PostNullableBodyMarksDestructured = PostNullableBodyContent[];
export type PostNullableBodyDestructured = {
  type: string;
  from: number | null;
  to: number | null;
  attrs: PostNullableBodyAttrs;
  content: PostNullableBodyContent | null;
  text: string | null;
  marks: PostNullableBodyMarks | null;
};
export type PostRequiredBodyAttrsDestructured = {
  [key: string]: PostRequiredBodyAttrsValue | undefined;
};
export type PostRequiredBodyContentItemAttrsDestructured = {
  [key: string]: PostRequiredBodyContentItemAttrsValue | undefined;
};
export type PostRequiredBodyContentItemContentDestructured =
  PostRequiredBodyContent[];
export type PostRequiredBodyContentItemMarksDestructured =
  PostRequiredBodyContent[];
export type PostRequiredBodyContentItemDestructured = {
  type: string;
  from: number | null;
  to: number | null;
  attrs: PostRequiredBodyContentItemAttrs;
  content: PostRequiredBodyContentItemContent | null;
  text: string | null;
  marks: PostRequiredBodyContentItemMarks | null;
};
export type PostRequiredBodyContentDestructured = PostRequiredBodyContentItem[];
export type PostRequiredBodyMarksDestructured = PostRequiredBodyContent[];
export type PostRequiredBodyDestructured = {
  type: string;
  from: number | null;
  to: number | null;
  attrs: PostRequiredBodyAttrs;
  content: PostRequiredBodyContent | null;
  text: string | null;
  marks: PostRequiredBodyMarks | null;
};
export type PostFilesDestructured = {
  [key: string]: PostFilesValue | undefined;
};
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

/** Index filters for Post **/

export type PostFilter = never;
