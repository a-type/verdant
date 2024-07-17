import {
	ClientDescriptor,
	ClientDescriptorOptions,
} from './client/ClientDescriptor.js';
import { Client } from './client/Client.js';
export type { ClientWithCollections } from './client/Client.js';
export { ClientDescriptor };
export { Client };
// backward compat
export { ClientDescriptor as StorageDescriptor };
export { Client as Storage };
export type { ClientDescriptorOptions };
export type { ClientDescriptorOptions as StorageInitOptions };
export { Entity } from './entities/Entity.js';
export type {
	ObjectEntity,
	ListEntity,
	EntityShape,
	AccessibleEntityProperty,
	AnyEntity,
	EntityDestructured,
	EntityInit,
} from './entities/types.js';
export { ServerSync } from './sync/Sync.js';
export type { SyncTransportMode } from './sync/Sync.js';
export { EntityFile, type EntityFileSnapshot } from './files/EntityFile.js';
export {
	/** @deprecated - use schema.collection */
	collection,
	schema,
	createDefaultMigration,
	migrate,
	createMigration,
} from '@verdant-web/common';
export type {
	StorageDocument,
	StorageSchema,
	StorageCollectionSchema,
	StorageAnyFieldSchema,
	StorageArrayFieldSchema,
	StorageObjectFieldSchema,
	StorageBooleanFieldSchema,
	StorageFieldSchema,
	StorageFileFieldSchema,
	StorageMapFieldSchema,
	StorageNumberFieldSchema,
	StorageStringFieldSchema,
	StorageFieldsSchema,
	IndexValueTag,
	Migration,
} from '@verdant-web/common';
export type { UserInfo } from '@verdant-web/common';
export type { Query } from './queries/types.js';
export type { QueryStatus } from './queries/BaseQuery.js';
export type { CollectionQueries } from './queries/CollectionQueries.js';
export { MigrationPathError } from './migration/errors.js';
export * from './utils/id.js';
export { UndoHistory } from './UndoHistory.js';
export * from './authorization.js';
export * from './sync/cliSync.js';
