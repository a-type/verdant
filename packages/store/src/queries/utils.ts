import { CollectionIndexFilter, hashObject } from '@verdant-web/common';
import { Entity } from '../entities/2/Entity.js';

function existsFilter<T>(x: T | null): x is T {
	return x !== null;
}

export function filterResultSet(results: any): any {
	if (Array.isArray(results)) {
		return results.map(filterResultSet).filter(existsFilter);
	} else if (results instanceof Entity) {
		return results.deleted ? null : results;
	} else {
		return results;
	}
}

export function areIndexesEqual(
	a?: CollectionIndexFilter,
	b?: CollectionIndexFilter,
) {
	return (!a && !b) || (a && b && hashObject(a) === hashObject(b));
}
