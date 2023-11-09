export type StorageStringFieldSchema = {
	type: 'string';
	/** @deprecated - add an index to indexes with this field name. */
	indexed?: boolean;
	nullable?: boolean;
	default?: string | (() => string);
};
export type StorageNumberFieldSchema = {
	type: 'number';
	/** @deprecated - add an index to indexes with this field name. */
	indexed?: boolean;
	nullable?: boolean;
	default?: number | (() => number);
};
export type StorageBooleanFieldSchema = {
	type: 'boolean';
	nullable?: boolean;
	default?: boolean | (() => boolean);
	/** @deprecated - add an index to indexes with this field name. */
	indexed?: boolean;
};
export type StorageArrayFieldSchema = {
	type: 'array';
	items: NestedStorageFieldSchema;
	nullable?: boolean;
};
export type StorageObjectFieldSchema = {
	type: 'object';
	properties: NestedStorageFieldsSchema;
	nullable?: boolean;
};
export type StorageAnyFieldSchema = {
	type: 'any';
	default?: any;
};
export type StorageMapFieldSchema<V extends NestedStorageFieldSchema> = {
	type: 'map';
	values: V;
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
};

export type StorageFieldSchema =
	| StorageStringFieldSchema
	| StorageNumberFieldSchema
	| StorageBooleanFieldSchema
	| StorageArrayFieldSchema
	| StorageObjectFieldSchema
	| StorageAnyFieldSchema
	| StorageMapFieldSchema<any>
	| StorageFileFieldSchema;

// nested versions don't have index info
export type NestedStorageStringFieldSchema = {
	type: 'string';
	nullable?: boolean;
	default?: string | (() => string);
};
export type NestedStorageNumberFieldSchema = {
	type: 'number';
	nullable?: boolean;
	default?: number | (() => number);
};
export type NestedStorageBooleanFieldSchema = {
	type: 'boolean';
	nullable?: boolean;
	default: boolean | (() => boolean);
};

export type NestedStorageFieldSchema =
	| NestedStorageStringFieldSchema
	| NestedStorageNumberFieldSchema
	| NestedStorageBooleanFieldSchema
	| StorageArrayFieldSchema
	| StorageObjectFieldSchema
	| StorageAnyFieldSchema
	| StorageMapFieldSchema<any>
	| StorageFileFieldSchema;

export type StorageFieldsSchema = Record<string, StorageFieldSchema>;

export type NestedStorageFieldsSchema = Record<
	string,
	NestedStorageFieldSchema
>;

// filters to only fields which can be indexed
export type StorageIndexableFields<Fields extends StorageFieldsSchema> = {
	[K in keyof Fields]: Fields[K] extends { indexed: boolean } ? K : never;
};
