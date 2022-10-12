export * from './v2/index.js';
export {
	collection,
	schema,
	createDefaultMigration,
	migrate,
} from '@lo-fi/common';
export type { StorageDocument } from '@lo-fi/common';

export interface Presence {}

export interface Profile {}

import type { UserInfo as BaseUserInfo } from '@lo-fi/common';

export type UserInfo = BaseUserInfo<Profile, Presence>;
