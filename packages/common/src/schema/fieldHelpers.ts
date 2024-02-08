import {
	NestedStorageFieldSchema,
	NestedStorageFieldsSchema,
	ShapeFromFieldsWithDefaults,
	StorageAnyFieldSchema,
	StorageArrayFieldSchema,
	StorageBooleanFieldSchema,
	StorageFileFieldSchema,
	StorageMapFieldSchema,
	StorageNumberFieldSchema,
	StorageObjectFieldSchema,
	StorageStringFieldSchema,
} from './types.js';

const objectField = <Props extends NestedStorageFieldsSchema>(args: {
	properties: Props;
	nullable?: boolean;
	default?:
		| ShapeFromFieldsWithDefaults<Props>
		| (() => ShapeFromFieldsWithDefaults<Props>);
}): StorageObjectFieldSchema<Props> => {
	return {
		type: 'object',
		...args,
	};
};

const arrayField = <T extends NestedStorageFieldSchema>(args: {
	items: T;
	nullable?: boolean;
}): StorageArrayFieldSchema<T> => {
	return {
		type: 'array',
		...args,
	};
};

const stringField = (args?: {
	nullable?: boolean;
	default?: string | (() => string);
	options?: string[];
}): StorageStringFieldSchema => {
	return {
		type: 'string',
		...args,
	};
};

const numberField = (args?: {
	nullable?: boolean;
	default?: number | (() => number);
}): StorageNumberFieldSchema => {
	return {
		type: 'number',
		...args,
	};
};

const booleanField = (args?: {
	nullable?: boolean;
	default?: boolean | (() => boolean);
}): StorageBooleanFieldSchema => {
	return {
		type: 'boolean',
		...args,
	};
};

const anyField = <TShape>(args?: {
	default?: TShape;
}): StorageAnyFieldSchema<TShape> => {
	return {
		type: 'any',
		...args,
	};
};

const mapField = <T extends NestedStorageFieldSchema>(args: {
	values: T;
}): StorageMapFieldSchema<T> => {
	return {
		type: 'map',
		...args,
	};
};

const fileField = (args: {
	nullable?: boolean;
	downloadRemote?: boolean;
}): StorageFileFieldSchema => {
	return {
		type: 'file',
		...args,
	};
};

export const fields = {
	object: objectField,
	array: arrayField,
	string: stringField,
	number: numberField,
	boolean: booleanField,
	any: anyField,
	map: mapField,
	file: fileField,
};
