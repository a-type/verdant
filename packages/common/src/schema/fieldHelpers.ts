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

const objectField = <Props extends StorageFieldsSchema>(args: {
	properties: Props;
	nullable?: boolean;
	default?:
		| ShapeFromFieldsWithDefaults<Props>
		| (() => ShapeFromFieldsWithDefaults<Props>);
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
}): StorageObjectFieldSchema<Props> => {
	return {
		type: 'object',
		...args,
	};
};

const arrayField = <T extends StorageFieldSchema>(args: {
	items: T;
	nullable?: boolean;
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
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

const mapField = <T extends StorageFieldSchema>(args: {
	values: T;
	/** Add some docs to your field which will annotate the generated typing */
	documentation?: string;
}): StorageMapFieldSchema<T> => {
	return {
		type: 'map',
		...args,
	};
};

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
	string: stringField,
	number: numberField,
	boolean: booleanField,
	any: anyField,
	map: mapField,
	file: fileField,
	id: idField,
};
