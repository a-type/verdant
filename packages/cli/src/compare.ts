/**
 * Recursively compares two objects by value, ignoring keys
 * if specified.
 *
 * Returns `true` if objects are the same
 */
export function compareObjects(
	a: any,
	b: any,
	{ ignoreKeys }: { ignoreKeys?: string[] } = {},
): boolean {
	if (a === b) {
		return true;
	}
	if (typeof a !== typeof b) {
		return false;
	}
	if (typeof a !== 'object') {
		return false;
	}
	if (Array.isArray(a) !== Array.isArray(b)) {
		return false;
	}
	if (Array.isArray(a)) {
		if (a.length !== b.length) {
			return false;
		}
		return a.every((item, i) => compareObjects(item, b[i]));
	}
	const aKeys = Object.keys(a).filter((key) => !ignoreKeys?.includes(key));
	const bKeys = Object.keys(b).filter((key) => !ignoreKeys?.includes(key));
	if (aKeys.length !== bKeys.length) {
		return false;
	}
	const keys = new Set([...aKeys, ...bKeys]);
	if (ignoreKeys) {
		ignoreKeys.forEach((key) => keys.delete(key));
	}

	return [...keys].every((key) => compareObjects(a[key], b[key]));
}
