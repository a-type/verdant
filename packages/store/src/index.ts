import { Client } from './client/Client.js';
import type { ContextInit } from './context/context.js';
export type { ClientWithCollections } from './client/Client.js';
export { Client, type ClientDescriptorOptions, type ClientInitOptions };
type ClientInitOptions = ContextInit;
/** @deprecated - use ClientInitOptions alias */
type ClientDescriptorOptions = ClientInitOptions;
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
export * from './logger.js';
export { IdbPersistence } from './persistence/idb/idbPersistence.js';
export type * from './persistence/interfaces.js';
export type { QueryStatus } from './queries/BaseQuery.js';
export type { CollectionQueries } from './queries/CollectionQueries.js';
export type { Query } from './queries/types.js';
export * from './sync/cliSync.js';
export { ServerSync, type ServerSyncOptions } from './sync/Sync.js';
export type { SyncTransportMode } from './sync/Sync.js';
export { UndoHistory } from './UndoHistory.js';
export * from './utils/id.js';
export { Client as Storage };
