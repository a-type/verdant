import {
	CollectionIndexName,
	CollectionProperties,
	CollectionSchemaCompoundIndexes,
	StorageCollectionSchema,
} from './collection.js';
import { CollectionCompoundIndexName } from './compounds.js';
import {
	IndexableShapeFromCompoundProperty,
	ShapeFromProperty,
} from './shapes.js';

export type MatchCollectionIndexFilter<
	Collection extends StorageCollectionSchema<any, any, any>,
	Index extends CollectionIndexName<Collection>,
> = {
	where: Index;
	equals: ShapeFromProperty<CollectionProperties<Collection>[Index]>;
	order?: 'asc' | 'desc';
};

export type RangeCollectionIndexFilter<
	Collection extends StorageCollectionSchema<any, any, any>,
	Index extends CollectionIndexName<Collection>,
> = {
	where: Index;
	gte?: ShapeFromProperty<CollectionProperties<Collection>[Index]>;
	lte?: ShapeFromProperty<CollectionProperties<Collection>[Index]>;
	gt?: ShapeFromProperty<CollectionProperties<Collection>[Index]>;
	lt?: ShapeFromProperty<CollectionProperties<Collection>[Index]>;
	order?: 'asc' | 'desc';
};

export type CollectionIndexFilter<
	Collection extends StorageCollectionSchema<any, any, any>,
	Index extends CollectionIndexName<Collection>,
> =
	| MatchCollectionIndexFilter<Collection, Index>
	| RangeCollectionIndexFilter<Collection, Index>
	| CollectionCompoundIndexFilter<Collection, Index>;

export type CollectionCompoundIndexFilter<
	Collection extends StorageCollectionSchema<any, any, any>,
	Index extends CollectionIndexName<Collection>,
> = Index extends CollectionCompoundIndexName<Collection>
	? {
			where: Index;
			match: {
				[K in CollectionSchemaCompoundIndexes<Collection>[Index]['of'][number]]?: IndexableShapeFromCompoundProperty<
					CollectionProperties<Collection>[K]
				>;
			};
			order: 'asc' | 'desc';
	  }
	: never;

export type CollectionFilter<
	Collection extends StorageCollectionSchema<any, any, any>,
	IndexName extends CollectionIndexName<Collection>,
> = CollectionIndexFilter<Collection, IndexName>;
