import { Entity } from '../reactives/Entity.js';

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
