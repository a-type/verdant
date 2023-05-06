import type schema from './schema.js';
import type { StorageSchema } from '@verdant/common';
import type {
	Storage,
	StorageInitOptions,
	ObjectEntity,
	ListEntity,
	Query,
	ServerSync,
	EntityFile,
} from '@verdant/web';
export * from '@verdant/web';
export type Schema = typeof schema;

interface Collection<
	Document extends ObjectEntity<any, any>,
	Snapshot,
	Init,
	Filter,
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
	readonly pages: Collection<Page, PageSnapshot, PageInit, PageFilter>;

	readonly assets: Collection<Asset, AssetSnapshot, AssetInit, AssetFilter>;

	sync: ServerSync<Profile, Presence>;
	undoHistory: Storage['undoHistory'];
	namespace: Storage['namespace'];
	entities: Storage['entities'];
	queryStore: Storage['queryStore'];
	batch: Storage['batch'];
	files: Storage['files'];

	close: Storage['close'];

	export: Storage['export'];
	import: Storage['import'];

	stats: () => Promise<any>;
	/**
	 * Resets all local data. Use with caution. If this replica
	 * is synced, it can restore from the server, but if it is not,
	 * the data will be permanently lost.
	 */
	__dangerous__resetLocal: Storage['__dangerous__resetLocal'];
}

// schema is provided internally. loadInitialData must be revised to pass the typed Client
interface ClientInitOptions<Presence = any, Profile = any>
	extends Omit<StorageInitOptions<Presence, Profile>, 'schema'> {}

export class ClientDescriptor<Presence = any, Profile = any> {
	constructor(init: ClientInitOptions<Presence, Profile>);
	open: () => Promise<Client<Presence, Profile>>;
	readonly current: Client<Presence, Profile> | null;
	readonly readyPromise: Promise<Client<Presence, Profile>>;
	readonly schema: StorageSchema;
	readonly namespace: string;
	close: () => Promise<void>;
}
export type Page = ObjectEntity<PageInit, PageDestructured>;

export type PageFilter = never;
export type PageDestructured = {
	id: string;
	version: number;
	shapes: PageShapes;
	bindings: PageBindings;
	assets: PageAssets;
};
export type PageInit = {
	id?: string;
	version: number;
	shapes?: PageShapesInit;
	bindings?: PageBindingsInit;
	assets?: PageAssetsInit;
};
export type PageSnapshot = {
	id: string;
	version: number;
	shapes: PageShapesSnapshot;
	bindings: PageBindingsSnapshot;
	assets: PageAssetsSnapshot;
};
/** Page sub-object types */

type PageId = string;
type PageIdInit = PageId | undefined;
type PageIdSnapshot = PageId;
type PageIdDestructured = PageId;
type PageVersion = number;
type PageVersionInit = PageVersion;
type PageVersionSnapshot = PageVersion;
type PageVersionDestructured = PageVersion;
export type PageShapes = ObjectEntity<PageShapesInit, PageShapesDestructured>;
export type PageShapesInit = Record<string, PageShapesValueInit>;
export type PageShapesDestructured = {
	[key: string]: PageShapesValue | undefined;
};
export type PageShapesSnapshot = Record<string, PageShapesValueSnapshot>;
type PageShapesValue = any;
type PageShapesValueInit = PageShapesValue | undefined;
type PageShapesValueSnapshot = PageShapesValue;
type PageShapesValueDestructured = PageShapesValue;

export type PageBindings = ObjectEntity<
	PageBindingsInit,
	PageBindingsDestructured
>;
export type PageBindingsInit = Record<string, PageBindingsValueInit>;
export type PageBindingsDestructured = {
	[key: string]: PageBindingsValue | undefined;
};
export type PageBindingsSnapshot = Record<string, PageBindingsValueSnapshot>;
type PageBindingsValue = any;
type PageBindingsValueInit = PageBindingsValue | undefined;
type PageBindingsValueSnapshot = PageBindingsValue;
type PageBindingsValueDestructured = PageBindingsValue;

export type PageAssets = ObjectEntity<PageAssetsInit, PageAssetsDestructured>;
export type PageAssetsInit = Record<string, PageAssetsValueInit>;
export type PageAssetsDestructured = {
	[key: string]: PageAssetsValue | undefined;
};
export type PageAssetsSnapshot = Record<string, PageAssetsValueSnapshot>;
export type PageAssetsValue = ObjectEntity<
	PageAssetsValueInit,
	PageAssetsValueDestructured
>;
export type PageAssetsValueInit = {
	type: string;
	size?: PageAssetsValueSizeInit;
};
export type PageAssetsValueDestructured = {
	type: string;
	size: PageAssetsValueSize;
};
export type PageAssetsValueSnapshot = {
	type: string;
	size: PageAssetsValueSizeSnapshot;
};
type PageAssetsValueType = string;
type PageAssetsValueTypeInit = PageAssetsValueType;
type PageAssetsValueTypeSnapshot = PageAssetsValueType;
type PageAssetsValueTypeDestructured = PageAssetsValueType;
export type PageAssetsValueSize = ListEntity<
	PageAssetsValueSizeInit,
	PageAssetsValueSizeDestructured
>;
export type PageAssetsValueSizeInit = Array<PageAssetsValueSizeItemInit>;
export type PageAssetsValueSizeDestructured = Array<PageAssetsValueSizeItem>;
export type PageAssetsValueSizeSnapshot =
	Array<PageAssetsValueSizeItemSnapshot>;
type PageAssetsValueSizeItem = number;
type PageAssetsValueSizeItemInit = PageAssetsValueSizeItem;
type PageAssetsValueSizeItemSnapshot = PageAssetsValueSizeItem;
type PageAssetsValueSizeItemDestructured = PageAssetsValueSizeItem;
export type Asset = ObjectEntity<AssetInit, AssetDestructured>;

export type AssetFilter = never;
export type AssetDestructured = {
	id: string;
	file: AssetFile;
};
export type AssetInit = {
	id: string;
	file: AssetFileInit;
};
export type AssetSnapshot = {
	id: string;
	file: AssetFileSnapshot;
};
/** Asset sub-object types */

type AssetId = string;
type AssetIdInit = AssetId;
type AssetIdSnapshot = AssetId;
type AssetIdDestructured = AssetId;
export type AssetFile = EntityFile;
export type AssetFileInit = File;
export type AssetFileDestructured = EntityFile;
export type AssetFileSnapshot = string;
