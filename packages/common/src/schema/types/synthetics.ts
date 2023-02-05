import { StorageFieldsSchema } from './fields.js';
import { ShapeFromFields } from './shapes.js';

export type StorageStringSyntheticSchema<Fields extends StorageFieldsSchema> = {
	type: 'string';
	compute: (value: ShapeFromFields<Fields>) => string | string[] | null;
};
export type StorageNumberSyntheticSchema<Fields extends StorageFieldsSchema> = {
	type: 'number';
	compute: (value: ShapeFromFields<Fields>) => number | number[] | null;
};
export type StorageBooleanSyntheticSchema<Fields extends StorageFieldsSchema> =
	{
		type: 'boolean';
		compute: (value: ShapeFromFields<Fields>) => boolean | boolean[] | null;
	};

export type StorageSyntheticIndices<Fields extends StorageFieldsSchema> =
	Record<string, StorageSyntheticIndexSchema<Fields>>;

export type StorageSyntheticIndexSchema<Fields extends StorageFieldsSchema> =
	| StorageStringSyntheticSchema<Fields>
	| StorageNumberSyntheticSchema<Fields>
	| StorageBooleanSyntheticSchema<Fields>;
