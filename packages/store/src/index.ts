import { Client } from './client/Client.js';
import {
	ClientDescriptor,
	ClientDescriptorOptions,
} from './client/ClientDescriptor.js';
export type { ClientWithCollections } from './client/Client.js';
export { Client, ClientDescriptor };
// backward compat
export { createMigration, schema } from '@verdant-web/common';
export type {
	CollectionFilter,
	DocumentBaseline,
	FileData,
	IndexValueTag,
	Migration,
	ObjectIdentifier,
	StorageAnyFieldSchema,
	StorageArrayFieldSchema,
	StorageBooleanFieldSchema,
	StorageCollectionSchema,
	StorageDocument,
	StorageFieldSchema,
	StorageFieldsSchema,
	StorageFileFieldSchema,
	StorageMapFieldSchema,
	StorageNumberFieldSchema,
	StorageObjectFieldSchema,
	StorageSchema,
	StorageStringFieldSchema,
	UserInfo,
	VerdantError,
	VerdantErrorCode,
} from '@verdant-web/common';
export * from './authorization.js';
export { Entity, getEntityClient } from './entities/Entity.js';
export type {
	AccessibleEntityProperty,
	AnyEntity,
	EntityDestructured,
	EntityInit,
	EntityShape,
	ListEntity,
	ObjectEntity,
} from './entities/types.js';
export { EntityFile, type EntityFileSnapshot } from './files/EntityFile.js';
export { IdbPersistence } from './persistence/idb/idbPersistence.js';
export type * from './persistence/interfaces.js';
export type { QueryStatus } from './queries/BaseQuery.js';
export type { CollectionQueries } from './queries/CollectionQueries.js';
export type { Query } from './queries/types.js';
export * from './sync/cliSync.js';
export { ServerSync } from './sync/Sync.js';
export type { SyncTransportMode } from './sync/Sync.js';
export { UndoHistory } from './UndoHistory.js';
export * from './utils/id.js';
export { Client as Storage, ClientDescriptor as StorageDescriptor };
export type {
	ClientDescriptorOptions,
	ClientDescriptorOptions as StorageInitOptions,
};
