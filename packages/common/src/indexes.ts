// unlikely to be used unicode character
export const COMPOUND_INDEX_SEPARATOR = '\uFFFFFE';
// 1 lower than separator
export const COMPOUND_INDEX_LOWER_BOUND_SEPARATOR = '\u0000';
// 1 higher than separator
export const COMPOUND_INDEX_UPPER_BOUND_SEPARATOR = '\uFFFFFF';

type IndexableFieldValue = string | number | boolean | any[];
export type CompoundIndexValue = string | string[];

export function createCompoundIndexValue(
	...fields: IndexableFieldValue[]
): CompoundIndexValue {
	const value = expandArrayIndex(fields);
	if (value.length === 1) {
		return value[0];
	}
	return value;
}

export function createUpperBoundIndexValue(
	...fields: IndexableFieldValue[]
): string {
	return (
		fields.join(COMPOUND_INDEX_SEPARATOR) +
		`${COMPOUND_INDEX_UPPER_BOUND_SEPARATOR}`
	);
}

export function createLowerBoundIndexValue(
	...fields: IndexableFieldValue[]
): string {
	return (
		fields.join(COMPOUND_INDEX_SEPARATOR) +
		`${COMPOUND_INDEX_SEPARATOR}${COMPOUND_INDEX_LOWER_BOUND_SEPARATOR}`
	);
}

/**
 * Whenever an array value is included in a compound index, we have to expand
 * the value to include all permutations of values in the array.
 * For example if we had an index id + tags on a document
 *
 * {
 *   id: '1',
 *   tags: ['a', 'b']
 * }
 *
 * we want to create an index:
 *
 * id_tags: ['1#a', '1#b']
 *
 * If multiple arrays are indexed we have to exponentially expand...
 *
 * id_tags_tags2: ['1#a#a', '1#a#b', '1#b#a', '1#b#b']
 *
 * To generalize this we construct a 2-level array of strings.
 * Iterating over indexed values, we expand each item into N items if
 * the current value is an array.
 *
 * Then we combine all nested arrays into compound index values.
 * This will produce an array of 1 element if none of the indexed values
 * were arrays. The caller should unwrap that.
 *
 * This function also deduplicates values.
 */
function expandArrayIndex(fields: IndexableFieldValue[]): string[] {
	let value: string[][] = [[]];
	for (const field of fields) {
		if (Array.isArray(field)) {
			const newValue: string[][] = [];
			for (const previousValue of value) {
				for (const fieldValue of field) {
					newValue.push(previousValue.concat(fieldValue));
				}
			}
			value = newValue;
		} else {
			for (const item of value) {
				item.push(`${field}`);
			}
		}
	}
	return Array.from(
		new Set(
			value.map((item) => {
				return item.join(COMPOUND_INDEX_SEPARATOR);
			}),
		),
	);
}
