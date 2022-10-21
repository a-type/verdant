export type MatchCollectionIndexFilter = {
	where: string;
	equals: any;
	order?: 'asc' | 'desc';
};

export type RangeCollectionIndexFilter = {
	where: string;
	gte?: any;
	lte?: any;
	gt?: any;
	lt?: any;
	order?: 'asc' | 'desc';
};

export type CollectionIndexFilter =
	| MatchCollectionIndexFilter
	| RangeCollectionIndexFilter
	| CollectionCompoundIndexFilter;

export type CollectionCompoundIndexFilter = {
	where: string;
	match: Record<string, any>;
	order: 'asc' | 'desc';
};

export type CollectionFilter = CollectionIndexFilter;
