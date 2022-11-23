export { StorageDescriptor, Storage } from './Storage.js';
export type { StorageInitOptions } from './Storage.js';
export { Query } from './Query.js';
export { ObjectEntity, ListEntity } from './reactives/Entity.js';
export type {
	Entity,
	EntityShape,
	AccessibleEntityProperty,
	DestructuredEntity,
} from './reactives/Entity.js';
export { ServerSync } from './Sync.js';

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
