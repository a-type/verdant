import { LEGACY_OID_KEY, OID_KEY } from '../oids.js';
import { isObject } from '../utils.js';
import { StorageCollectionSchema, StorageFieldSchema } from './types.js';

export function validateEntity(schema: StorageCollectionSchema, entity: any) {
	for (const [key, value] of Object.entries(entity)) {
		if (!schema.fields[key]) {
			throw new Error(`Invalid field "${key}"`);
		}
		if (value) {
			validateEntityField(schema.fields[key], value);
		}
	}
}

export function validateEntityField(
	field: StorageFieldSchema,
	value: any,
	fieldPath: string[] = [],
) {
	if (field.type === 'object') {
		if (!isObject(value)) {
			if (value === null && field.nullable) return;
			throw new Error(
				`Expected object${
					field.nullable ? ' or null' : ''
				} for field ${formatField(fieldPath)}}`,
			);
		}
		for (const [key, subField] of Object.entries(field.properties)) {
			if (value[key]) {
				validateEntityField(subField, value[key]);
			}
		}
		for (const key of Object.keys(value)) {
			if (!field.properties[key]) {
				throw new Error(
					`Invalid field "${key}" on value ${formatField(fieldPath)}`,
				);
			}
		}
	} else if (field.type === 'array') {
		if (!Array.isArray(value)) {
			if (value === null && field.nullable) return;
			throw new Error(
				`Expected array${
					field.nullable ? ' or null' : ''
				} for field ${formatField(fieldPath)}}`,
			);
		}
		for (const item of value) {
			validateEntityField(field.items, item);
		}
	} else if (field.type === 'map') {
		if (!isObject(value)) {
			throw new Error(`Expected map for field ${formatField(fieldPath)}}`);
		}
		for (const [key, item] of Object.entries(value)) {
			// santiy check to weed out any id field
			if (key === OID_KEY || key === LEGACY_OID_KEY) continue;
			validateEntityField(field.values, item);
		}
	} else if (field.type === 'string') {
		if (typeof value !== 'string') {
			if (value === null && field.nullable) return;
			throw new Error(
				`Expected string ${
					field.nullable ? ' or null' : ''
				} for field ${formatField(fieldPath)}}`,
			);
		}
	} else if (field.type === 'boolean') {
		if (typeof value !== 'boolean') {
			if (value === null && field.nullable) return;
			throw new Error(
				`Expected boolean ${
					field.nullable ? ' or null' : ''
				} for field ${formatField(fieldPath)}}`,
			);
		}
	} else if (field.type === 'number') {
		if (typeof value !== 'number') {
			if (value === null && field.nullable) return;
			throw new Error(
				`Expected number ${
					field.nullable ? ' or null' : ''
				} for field ${formatField(fieldPath)}}`,
			);
		}
	} else if (field.type === 'file') {
		if (value === null && !field.nullable) {
			throw new Error(`Expected file for field ${formatField(fieldPath)}}`);
		}
	}
}

function formatField(fieldPath: string[]) {
	return fieldPath.join('.');
}
