import { v4 } from 'uuid';
import { assignOid, maybeGetOid } from './oids.js';
import hash from 'object-hash';

export function take<T extends object, Keys extends keyof T>(
	obj: T,
	keys: Keys[],
): Pick<T, Keys> {
	const result: any = {};
	for (const key of keys) {
		result[key] = obj[key];
	}
	return result;
}

export function omit<T extends object, Keys extends keyof T>(
	obj: T,
	keys: Keys[],
): Omit<T, Keys> {
	const result: any = {};
	for (const key of Object.keys(obj)) {
		if (!keys.includes(key as Keys)) {
			result[key] = (obj as any)[key];
		}
	}
	return result;
}

export function getSortedIndex<T>(
	array: T[],
	insert: T,
	compare: (a: T, b: T) => number,
) {
	let low = 0;
	let high = array.length;
	while (low < high) {
		const mid = (low + high) >>> 1;
		const cmp = compare(array[mid], insert);
		if (cmp < 0) {
			low = mid + 1;
		} else {
			high = mid;
		}
	}
	return low;
}

function orderedReplacer(_: any, v: any) {
	if (typeof v !== 'object' || v === null || Array.isArray(v)) {
		return v;
	}
	return Object.fromEntries(
		Object.entries(v).sort(([ka], [kb]) => (ka < kb ? -1 : ka > kb ? 1 : 0)),
	);
}
/**
 * Consistently stringifies an object regardless
 * of key insertion order
 */
export function stableStringify(obj: any) {
	return JSON.stringify(obj, orderedReplacer);
}

/**
 * A version of structured cloning which preserves object identity
 * references in the system.
 */
export function cloneDeep<T>(obj: T, copyOids = true): T {
	if (isObject(obj) || Array.isArray(obj)) {
		const oid = maybeGetOid(obj);
		let clone: any;
		if (Array.isArray(obj)) {
			clone = obj.map((v) => cloneDeep(v, copyOids)) as T;
		} else {
			clone = {};
			for (const [key, value] of Object.entries(obj as any)) {
				clone[key] = cloneDeep(value, copyOids);
			}
		}
		if (copyOids && oid) {
			assignOid(clone, oid);
		}
		return clone;
	}
	return obj;
}

// TODO: better hash
export function hashObject(obj: any) {
	// hash the object into a unique string
	return hash(obj);
}

export function isObject(obj: any) {
	return obj && typeof obj === 'object';
}

export function roughSizeOfObject(object: any) {
	var objectList = [];
	var stack = [object];
	var bytes = 0;

	while (stack.length) {
		var value = stack.pop();

		if (typeof value === 'boolean') {
			bytes += 4;
		} else if (typeof value === 'string') {
			bytes += value.length * 2;
		} else if (typeof value === 'number') {
			bytes += 8;
		} else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
			objectList.push(value);

			for (var i in value) {
				stack.push(value[i]);
			}
		}
	}
	return bytes;
}

export function assert(
	condition: any,
	message: string = 'assertion failed',
): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

export function generateId(length = 16) {
	return v4().replace('-', '').slice(0, length);
}

export function findLastIndex<T>(array: T[], predicate: (item: T) => boolean) {
	for (let i = array.length - 1; i >= 0; i--) {
		if (predicate(array[i])) {
			return i;
		}
	}
	return -1;
}

export function debounce<T extends (...args: any[]) => any>(
	fn: T,
	wait: number,
): T {
	let timeout: any;
	return function (this: any, ...args: any[]) {
		const context = this;
		clearTimeout(timeout);
		timeout = setTimeout(() => fn.apply(context, args), wait);
	} as any;
}
