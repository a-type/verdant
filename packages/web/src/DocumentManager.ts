import {
	addFieldDefaults,
	assert,
	assignOid,
	createOid,
	diffToPatches,
	SchemaCollection,
	StorageCollectionSchema,
	StorageDocument,
	StorageFieldSchema,
	StorageFieldsSchema,
	StorageSchema,
} from '@lo-fi/common';
import { ObjectEntity } from './Entity.js';
import { EntityStore } from './EntityStore.js';
import { Metadata } from './Metadata.js';

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
		const primaryKey = init[primaryKeyName] as string;
		assert(
			primaryKey,
			`Document must have a primary key: ${primaryKeyName.toString()} (got: ${JSON.stringify(
				init,
			)})`,
		);
		return createOid(collection as string, primaryKey);
	};

	private addDefaults = (collectionName: string, init: any) => {
		const collection = this.schema.collections[
			collectionName
		] as StorageCollectionSchema;
		return addFieldDefaults(collection, init);
	};

	create = async (collection: string, init: any) => {
		const defaulted = this.addDefaults(collection, init);
		const oid = this.getOid(collection, defaulted);
		// documents are always objects at the root
		return this.entities.create(defaulted, oid) as unknown as ObjectEntity<any>;
	};

	upsert = async (collection: string, init: any) => {
		const defaulted = this.addDefaults(collection, init);
		const oid = this.getOid(collection, defaulted);
		const existing = await this.entities.getFromOid(oid);
		if (existing) {
			const patches = diffToPatches(
				assignOid(existing.getSnapshot(), oid),
				assignOid(init, oid),
				() => this.meta.now,
			);
			this.entities.enqueueOperations(patches);
			return existing;
		} else {
			// documents are always objects at the root
			return this.entities.create(defaulted, oid) as Promise<ObjectEntity<any>>;
		}
	};

	delete = async (collection: string, primaryKey: string) => {
		const oid = createOid(collection as string, primaryKey);
		return this.entities.delete(oid);
	};
}
