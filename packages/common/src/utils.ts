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

export function cloneDeep<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

// TODO: better hash
export function hashObject(obj: any) {
	return stableStringify(obj);
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
