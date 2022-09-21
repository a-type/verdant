import { StorageFieldsSchema } from './fields.js';
import { ShapeFromFields } from './shapes.js';

export type StorageStringSyntheticSchema<Fields extends StorageFieldsSchema> = {
	type: 'string';
	unique?: boolean;
	compute: (value: ShapeFromFields<Fields>) => string;
};
export type StorageNumberSyntheticSchema<Fields extends StorageFieldsSchema> = {
	type: 'number';
	unique?: boolean;
	compute: (value: ShapeFromFields<Fields>) => number;
};

export type StorageSyntheticIndices<Fields extends StorageFieldsSchema> =
	Record<string, StorageSyntheticIndexSchema<Fields>>;

export type StorageSyntheticIndexSchema<Fields extends StorageFieldsSchema> =
	| StorageStringSyntheticSchema<Fields>
	| StorageNumberSyntheticSchema<Fields>;
