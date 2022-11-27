import { StorageFieldsSchema } from './fields.js';
import { ShapeFromFields } from './shapes.js';

export type StorageStringSyntheticSchema<Fields extends StorageFieldsSchema> = {
	type: 'string';
	compute: (value: ShapeFromFields<Fields>) => string | null;
};
export type StorageNumberSyntheticSchema<Fields extends StorageFieldsSchema> = {
	type: 'number';
	compute: (value: ShapeFromFields<Fields>) => number | null;
};
export type StorageBooleanSyntheticSchema<Fields extends StorageFieldsSchema> =
	{
		type: 'boolean';
		compute: (value: ShapeFromFields<Fields>) => boolean | null;
	};
export type StorageArraySyntheticSchema<Fields extends StorageFieldsSchema> = {
	type: 'array';
	compute: (value: ShapeFromFields<Fields>) => (string | number)[];
};

export type StorageSyntheticIndices<Fields extends StorageFieldsSchema> =
	Record<string, StorageSyntheticIndexSchema<Fields>>;

export type StorageSyntheticIndexSchema<Fields extends StorageFieldsSchema> =
	| StorageStringSyntheticSchema<Fields>
	| StorageNumberSyntheticSchema<Fields>
	| StorageBooleanSyntheticSchema<Fields>
	| StorageArraySyntheticSchema<Fields>;
