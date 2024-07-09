import {
	addFieldDefaults,
	constrainEntity,
	assert,
	createOid,
	SchemaCollection,
	StorageCollectionSchema,
	StorageDocument,
	StorageSchema,
	isRootOid,
	AuthorizationKey,
} from '@verdant-web/common';
import { EntityCreateOptions, EntityStore } from '../entities/EntityStore.js';
import { Metadata } from '../metadata/Metadata.js';
import { Sync } from '../sync/Sync.js';
import { Context } from '../context.js';
import { ObjectEntity } from '../index.js';

/**
 * Exposes functionality for creating documents,
 * the only mutation which is available as an entry
 * point in the storage system.
 */
export class DocumentManager<Schema extends StorageSchema<any>> {
	constructor(
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

	create = async (
		collection: string,
		init: any,
		options: {
			undoable?: boolean;
			access?: AuthorizationKey;
			silenceAccessControlWithPrimaryKeyWarning?: boolean;
		} = {},
	) => {
		const widenedOptions = options as EntityCreateOptions;
		const defaulted = this.addDefaults(collection, init);
		const validated = this.validate(collection, defaulted);
		const oid = this.getOid(collection, validated);

		if (options.access) {
			const collectionSchema = this.schema.collections[collection];
			if (
				options.access !== 'shared' &&
				init[collectionSchema.primaryKey] &&
				!options.silenceAccessControlWithPrimaryKeyWarning
			) {
				// using a custom primary key with access control is not supported.
				// resulting docs could collide with existing docs with different permissions,
				// leading to confusing results. this logs a warning.
				console.warn(
					`Using a custom primary key with access control is not supported. This may result in corrupted documents. Read more about why: https://verdant.dev/docs/sync/access#a-warning-about-custom-primaryKey`,
				);
			}
			widenedOptions.access = options.access;
		}

		// documents are always objects at the root
		return this.entities.create(validated, oid, widenedOptions) as any;
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

	clone = async (
		collection: string,
		entity: ObjectEntity<any, any>,
		options: {
			undoable?: boolean;
			access?: AuthorizationKey;
			primaryKey?: string;
		} = {},
	) => {
		if (!isRootOid(entity.uid)) {
			throw new Error('Cannot clone non-root documents');
		}
		// take the entity snapshot
		const snapshot = entity.getSnapshot();
		// remove the primary key
		const collectionSchema = this.schema.collections[collection];
		delete snapshot[collectionSchema.primaryKey];
		// if collection schema's primary key doesn't have a default value,
		// a user-supplied value is required
		if (!collectionSchema.fields[collectionSchema.primaryKey].default) {
			if (!options.primaryKey) {
				throw new Error(
					`Error cloning document from collection ${collection}: collection does not have a default on primary key. You must supply a value to options.primaryKey for the clone.`,
				);
			}
			snapshot[collectionSchema.primaryKey] = options.primaryKey;
		}
		return this.create(collection, snapshot, options);
	};
}
