export { StorageDescriptor, Storage } from './Storage.js';
export type { StorageInitOptions } from './Storage.js';
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
