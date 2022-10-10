import { StorageCollectionSchema } from './types/collection.js';

export * from './types/collection.js';
export * from './types/compounds.js';
export * from './types/fields.js';
export * from './types/filters.js';
export * from './types/shapes.js';
export * from './types/synthetics.js';

export interface StorageInit<
	Schemas extends StorageCollectionSchema<any, any, any>,
> {
	collections: Record<string, Schemas>;
}

export type StorageSchema<
	Collections extends {
		[k: string]: StorageCollectionSchema<any, any, any>;
	},
> = { version: number; collections: Collections };

export type SchemaCollectionName<Schema extends StorageSchema<any>> =
	Schema extends StorageSchema<infer Cs>
		? Exclude<keyof Cs, number | symbol>
		: never;

export type SchemaCollection<
	Schema extends StorageSchema<any>,
	Name extends SchemaCollectionName<Schema>,
> = Schema extends StorageSchema<infer Cs> ? Cs[Name] : never;
