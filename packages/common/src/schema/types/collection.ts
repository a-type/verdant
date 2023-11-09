import { CollectionCompoundIndices } from './compounds.js';
import { StorageFieldsSchema } from './fields.js';
import {
	DirectIndexableFieldName,
	StorageSyntheticIndices,
} from './synthetics.js';

/**
 * The main collection schema
 */
export type StorageCollectionSchema<
	Fields extends StorageFieldsSchema = StorageFieldsSchema,
	Synthetics extends
		StorageSyntheticIndices<Fields> = StorageSyntheticIndices<Fields>,
	Compounds extends CollectionCompoundIndices<
		Fields,
		Synthetics
	> = CollectionCompoundIndices<Fields, Synthetics>,
> = {
	name: string;
	/**
	 * Your primary key must be a string, number, or boolean field. It must also
	 * not be rewritten.
	 */
	primaryKey: DirectIndexableFieldName<Fields>;
	fields: Fields;
	indexes?: Synthetics;
	compounds?: Compounds;
	/**
	 * @deprecated - plural name is the key used to index this collection in the schema. this field is no longer used.
	 */
	pluralName?: string;
	/** @deprecated - use "indexes" */
	synthetics?: Synthetics;
};
