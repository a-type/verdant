export * from './v2/index.js';
export { collection, schema } from '@lofi/common';
export type { StorageDocument } from '@lofi/common';

export interface Presence {}

export interface Profile {}

import type { UserInfo as BaseUserInfo } from '@lofi/common';

export type UserInfo = BaseUserInfo<Profile, Presence>;
