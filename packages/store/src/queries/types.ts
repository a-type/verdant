import type { FindAllQuery } from './FindAllQuery.js';
import type { FindPageQuery } from './FindPageQuery.js';
import type { FindOneQuery } from './FindOneQuery.js';
import type { FindInfiniteQuery } from './FindInfiniteQuery.js';
import type { GetQuery } from './GetQuery.js';

export type Query<T> =
	| FindAllQuery<T>
	| FindPageQuery<T>
	| FindOneQuery<T>
	| FindInfiniteQuery<T>
	| GetQuery<T>;
