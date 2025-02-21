export type StorageStringFieldSchema = {
	type: 'string';
	nullable?: boolean;
	default?: string | (() => string);
	/** Limit the values to a certain set of options */
	options?: string[];
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
};
export type StorageNumberFieldSchema = {
	type: 'number';
	nullable?: boolean;
	default?: number | (() => number);
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
};
export type StorageBooleanFieldSchema = {
	type: 'boolean';
	nullable?: boolean;
	default?: boolean | (() => boolean);
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
};
export type StorageArrayFieldSchema<TItems extends StorageFieldSchema> = {
	type: 'array';
	items: TItems;
	nullable?: boolean;
	default?: any[] | (() => any[]);
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
};
export type StorageObjectFieldSchema<Props extends StorageFieldsSchema> = {
	type: 'object';
	properties: Props;
	nullable?: boolean;
	default?: Record<string, any> | (() => Record<string, any>);
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
};
export type StorageAnyFieldSchema<TShape = any> = {
	type: 'any';
	default?: TShape;
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
};
export type StorageMapFieldSchema<V extends StorageFieldSchema> = {
	type: 'map';
	values: V;
	default?: Record<string, any> | (() => Record<string, any>);
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
};
export type StorageFileFieldSchema = {
	type: 'file';
	nullable?: boolean;
	/**
	 * Instructs the client to download synced files to local storage on first request for offline use.
	 * Leave this false to save storage space on the client, at the cost of requiring a network
	 * connection to use files created by other devices.
	 */
	downloadRemote?: boolean;
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
};

export type StorageFieldSchema =
	| StorageStringFieldSchema
	| StorageNumberFieldSchema
	| StorageBooleanFieldSchema
	| StorageArrayFieldSchema<any>
	| StorageObjectFieldSchema<any>
	| StorageAnyFieldSchema
	| StorageMapFieldSchema<any>
	| StorageFileFieldSchema;

export type StorageFieldsSchema = {
	[key: string]: StorageFieldSchema;
};

// filters to only fields which can be indexed
export type StorageIndexableFields<Fields extends StorageFieldsSchema> = {
	[K in keyof Fields]: Fields[K] extends { indexed: boolean } ? K : never;
};
