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
export { LiveQuery as Query } from './queries/LiveQuery.js';
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

export {
	collection,
	schema,
	createDefaultMigration,
	migrate,
} from '@lo-fi/common';
export type {
	StorageDocument,
	StorageSchema,
	StorageCollectionSchema,
	Migration,
} from '@lo-fi/common';

export type { UserInfo } from '@lo-fi/common';
