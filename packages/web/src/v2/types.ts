import { StorageCollectionSchema, StorageDocument } from '@lo-fi/common';
import { ObjectEntity } from './Entity.js';

export type Document<
	Collection extends StorageCollectionSchema<any, any, any>,
> = ObjectEntity<StorageDocument<Collection>>;
