export type StorageStringFieldSchema = {
	type: 'string';
	indexed?: boolean;
	unique?: boolean;
	nullable?: boolean;
};
export type StorageNumberFieldSchema = {
	type: 'number';
	indexed?: boolean;
	unique?: boolean;
	nullable?: boolean;
};
export type StorageBooleanFieldSchema = {
	type: 'boolean';
	nullable?: boolean;
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
export type StorageFieldSchema =
	| StorageStringFieldSchema
	| StorageNumberFieldSchema
	| StorageBooleanFieldSchema
	| StorageArrayFieldSchema
	| StorageObjectFieldSchema;

// nested versions don't have index info
export type NestedStorageStringFieldSchema = {
	type: 'string';
	nullable?: boolean;
};
export type NestedStorageNumberFieldSchema = {
	type: 'number';
	nullable?: boolean;
};

export type NestedStorageFieldSchema =
	| NestedStorageStringFieldSchema
	| NestedStorageNumberFieldSchema
	| StorageBooleanFieldSchema
	| StorageArrayFieldSchema
	| StorageObjectFieldSchema;

export type StorageFieldsSchema = Record<string, StorageFieldSchema>;

export type NestedStorageFieldsSchema = Record<
	string,
	NestedStorageFieldSchema
>;

// filters to only fields which can be indexed
export type StorageIndexableFields<Fields extends StorageFieldsSchema> = {
	[K in keyof Fields]: Fields[K] extends { indexed: boolean } ? K : never;
};
