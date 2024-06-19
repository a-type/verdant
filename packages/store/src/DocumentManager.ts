import {
	addFieldDefaults,
	constrainEntity,
	assert,
	createOid,
	SchemaCollection,
	StorageCollectionSchema,
	StorageDocument,
	StorageSchema,
} from '@verdant-web/common';
import { EntityStore } from './entities/EntityStore.js';
import { Metadata } from './metadata/Metadata.js';

/**
 * Exposes functionality for creating documents,
 * the only mutation which is available as an entry
 * point in the storage system.
 */
export class DocumentManager<Schema extends StorageSchema<any>> {
	constructor(
		private meta: Metadata,
		private schema: Schema,
		private entities: EntityStore,
	) {}

	private getOid = (collection: string, init: any) => {
		const primaryKeyName = this.schema.collections[collection]
			.primaryKey as Exclude<
			keyof StorageDocument<SchemaCollection<Schema, any>>,
			symbol
		>;
		const primaryKey = init[primaryKeyName];
		assert(
			primaryKey,
			`Document must have a primary key: ${primaryKeyName.toString()} (got: ${JSON.stringify(
				init,
			)})`,
		);
		return createOid(collection, primaryKey);
	};

	private addDefaults = (collectionName: string, init: any) => {
		const collection = this.schema.collections[
			collectionName
		] as StorageCollectionSchema;
		return addFieldDefaults(collection, init);
	};

	private validate = (collectionName: string, init: any) => {
		const collection = this.schema.collections[
			collectionName
		] as StorageCollectionSchema;
		return constrainEntity(collection.fields, init);
	};

	create = (
		collection: string,
		init: any,
		options: { undoable?: boolean } = {},
	) => {
		const defaulted = this.addDefaults(collection, init);
		const validated = this.validate(collection, defaulted);
		const oid = this.getOid(collection, validated);
		// documents are always objects at the root
		return this.entities.create(validated, oid, options) as any;
	};

	delete = async (
		collection: string,
		primaryKey: string,
		options: { undoable?: boolean } = {},
	) => {
		const oid = createOid(collection, primaryKey);
		return this.entities.delete(oid, options);
	};

	deleteAll = async (
		ids: [string, string][],
		options: { undoable?: boolean } = {},
	) => {
		return this.entities.deleteAll(
			ids.map(([collection, primaryKey]) => createOid(collection, primaryKey)),
			options,
		);
	};

	deleteAllFromCollection = async (
		collection: string,
		ids: string[],
		options: { undoable?: boolean } = {},
	) => {
		return this.entities.deleteAll(
			ids.map((primaryKey) => createOid(collection, primaryKey)),
			options,
		);
	};
}
