export { Storage, storage } from './Storage.js';
export { StorageCollection } from './StorageCollection.js';
export type { CollectionInMemoryFilters } from './StorageCollection.js';
export { collection, schema } from '@lofi/common';
export type { StorageDocument } from '@lofi/common';
export { subscribe, LiveQuery } from './reactives/index.js';
export type { LiveDocument } from './reactives/index.js';

export interface Presence {}

export interface Profile {}

import type { UserInfo as BaseUserInfo } from '@lofi/common';

export type UserInfo = BaseUserInfo<Profile, Presence>;
