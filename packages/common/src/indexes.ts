import {
	StorageCollectionSchema,
	StorageSyntheticIndexSchema,
	CollectionCompoundIndex,
	StorageDirectSyntheticSchema,
} from './index.js';

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

export function isDirectSynthetic(
	index: any,
): index is StorageDirectSyntheticSchema<any> {
	return !!index.field;
}

export function computeSynthetics(schema: StorageCollectionSchema, obj: any) {
	const result: Record<string, any> = {};
	for (const [name, property] of Object.entries(schema.indexes || {})) {
		const index = property as StorageSyntheticIndexSchema<any>;
		if (isDirectSynthetic(index)) {
			result[name] = sanitizeIndexValue(obj[index.field]);
		} else {
			result[name] = sanitizeIndexValue(index.compute(obj));
		}
	}
	return result;
}

export function computeCompoundIndices(
	schema: StorageCollectionSchema<any, any, any>,
	doc: any,
): any {
	return Object.entries(schema.compounds || {}).reduce<
		Record<string, CompoundIndexValue>
	>((acc, [indexKey, index]) => {
		acc[indexKey] = createCompoundIndexValue(
			...(index as CollectionCompoundIndex<any, any>).of.map(
				(key) => doc[key] as string | number,
			),
		);
		return acc;
	}, {} as Record<string, CompoundIndexValue>);
}

function computeIndexedFields(schema: StorageCollectionSchema, doc: any) {
	return Object.entries(schema.fields).reduce<Record<string, any>>(
		(acc, [key, field]) => {
			// TODO: remove once I'm comfortable dropping 'indexed' support
			if ('indexed' in field) {
				acc[key] = sanitizeIndexValue(doc[key]);
			}
			return acc;
		},
		{},
	);
}

export function getIndexValues(
	schema: StorageCollectionSchema<any, any, any>,
	doc: any,
) {
	const basicIndexes: any = {
		[schema.primaryKey]: doc[schema.primaryKey],
		...computeIndexedFields(schema, doc),
		...computeSynthetics(schema, doc),
	};
	Object.assign(
		basicIndexes,
		computeCompoundIndices(schema, { ...doc, ...basicIndexes }),
	);
	return basicIndexes;
}

export function assignIndexValues(
	schema: StorageCollectionSchema<any, any, any>,
	doc: any,
) {
	Object.assign(doc, computeSynthetics(schema, doc));
	Object.assign(doc, computeCompoundIndices(schema, doc));
	return doc;
}

export const NULL_INDEX_VALUE = 'null';

export function sanitizeIndexValue(
	value: unknown,
): string | number | (string | number)[] {
	if (value === null) {
		return NULL_INDEX_VALUE;
	}
	if (typeof value === 'string' || typeof value === 'number') {
		return value;
	}
	if (typeof value === 'boolean' || value === null) {
		return `${value}`;
	}
	if (value === undefined) {
		// this shouldn't happen ,but for resiliency...
		return 'undefined';
	}
	if (Array.isArray(value)) {
		return value.map(sanitizeIndexValue) as any;
	}
	throw new Error(`Unsupported index value: ${value}`);
}
