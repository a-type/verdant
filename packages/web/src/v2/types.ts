import { StorageCollectionSchema, StorageDocument } from '@lofi-db/common';
import { ObjectEntity } from './Entity.js';

export type Document<
	Collection extends StorageCollectionSchema<any, any, any>,
> = ObjectEntity<StorageDocument<Collection>>;
