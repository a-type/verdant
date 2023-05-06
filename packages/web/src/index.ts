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
export { Entity } from './reactives/Entity.js';
export type {
	ObjectEntity,
	ListEntity,
	EntityShape,
	AccessibleEntityProperty,
	AnyEntity,
	EntityDestructured,
} from './reactives/Entity.js';
export { ServerSync } from './sync/Sync.js';
export type { SyncTransportMode } from './sync/Sync.js';
export { EntityFile } from './files/EntityFile.js';
export {
	collection,
	schema,
	createDefaultMigration,
	migrate,
} from '@verdant/common';
export type {
	StorageDocument,
	StorageSchema,
	StorageCollectionSchema,
	Migration,
} from '@verdant/common';
export type { UserInfo } from '@verdant/common';
export type { Query } from './queries2/types.js';
export type { CollectionQueries } from './queries2/CollectionQueries.js';
