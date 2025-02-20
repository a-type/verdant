import cuid from 'cuid';
import {
	ShapeFromFieldsWithDefaults,
	StorageAnyFieldSchema,
	StorageArrayFieldSchema,
	StorageBooleanFieldSchema,
	StorageFieldSchema,
	StorageFieldsSchema,
	StorageFileFieldSchema,
	StorageMapFieldSchema,
	StorageNumberFieldSchema,
	StorageObjectFieldSchema,
	StorageStringFieldSchema,
} from './types.js';

type ObjectFieldArgs<Props extends StorageFieldsSchema> = {
	/** @deprecated - use fields. renamed for more consistency with collection root. */
	properties?: Props;
	fields?: Props;
	nullable?: boolean;
	default?:
		| ShapeFromFieldsWithDefaults<Props>
		| (() => ShapeFromFieldsWithDefaults<Props>);
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
};

function objectField<Props extends StorageFieldsSchema>(
	args: ObjectFieldArgs<Props>,
): StorageObjectFieldSchema<Props> {
	const { properties, fields, ...resolvedArgs } = args;
	const props = properties || fields;
	if (!props) {
		throw new Error('objectField must be passed a properties object');
	}
	return {
		type: 'object',
		...resolvedArgs,
		properties: props,
	};
}

/**
 * Used for recursively defined field schemas. Replaces the original properties
 * of an object field with the provided fields. This will mutate the original field.
 */
function replaceObjectFields(
	object: StorageObjectFieldSchema<any>,
	fields: StorageFieldsSchema,
): StorageObjectFieldSchema<any> {
	object.properties = fields;
	return object;
}

type ArrayFieldArgs<T extends StorageFieldSchema> = {
	items: T;
	nullable?: boolean;
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
};

function arrayField<T extends StorageFieldSchema>(
	args: ArrayFieldArgs<T>,
): StorageArrayFieldSchema<T> {
	return {
		type: 'array',
		...args,
	};
}

/**
 * Used for recursively defined field schemas. Replaces the original items
 * of an array field with the provided items. This will mutate the original field.
 */
function replaceArrayItems(
	array: StorageArrayFieldSchema<any>,
	items: StorageFieldSchema,
): StorageArrayFieldSchema<any> {
	array.items = items;
	return array;
}

const stringField = (args?: {
	nullable?: boolean;
	default?: string | (() => string);
	options?: string[];
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
}): StorageStringFieldSchema => {
	return {
		type: 'string',
		...args,
	};
};

const numberField = (args?: {
	nullable?: boolean;
	default?: number | (() => number);
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
}): StorageNumberFieldSchema => {
	return {
		type: 'number',
		...args,
	};
};

const booleanField = (args?: {
	nullable?: boolean;
	default?: boolean | (() => boolean);
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
}): StorageBooleanFieldSchema => {
	return {
		type: 'boolean',
		...args,
	};
};

const anyField = <TShape>(args?: {
	default?: TShape;
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
}): StorageAnyFieldSchema<TShape> => {
	return {
		type: 'any',
		...args,
	};
};

type MapFieldArgs<T extends StorageFieldSchema> = {
	values: T;
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
};
function mapField<T extends StorageFieldSchema>(
	args: MapFieldArgs<T>,
): StorageMapFieldSchema<T> {
	return {
		type: 'map',
		...args,
	};
}

/**
 * Used for recursively defined field schemas. Replaces the original values
 * of a map field with the provided values. This will mutate the original field.
 */
function replaceMapValues(
	map: StorageMapFieldSchema<any>,
	values: StorageFieldSchema,
): StorageMapFieldSchema<any> {
	map.values = values;
	return map;
}

const fileField = (args?: {
	nullable?: boolean;
	downloadRemote?: boolean;
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
}): StorageFileFieldSchema => {
	return {
		type: 'file',
		...args,
	};
};

/**
 * Meant for use on primary key fields. Do not use this to refer
 * to another document as a 'foreign key'
 */
const idField = (): StorageStringFieldSchema => {
	return {
		type: 'string',
		default: cuid,
	};
};

export const fields = {
	object: objectField,
	array: arrayField,
	replaceObjectFields,
	replaceArrayItems,
	string: stringField,
	number: numberField,
	boolean: booleanField,
	any: anyField,
	map: mapField,
	replaceMapValues,
	file: fileField,
	id: idField,
};
