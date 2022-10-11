export * from './v2/index.js';
export { collection, schema } from '@lofi-db/common';
export type { StorageDocument } from '@lofi-db/common';

export interface Presence {}

export interface Profile {}

import type { UserInfo as BaseUserInfo } from '@lofi-db/common';

export type UserInfo = BaseUserInfo<Profile, Presence>;
