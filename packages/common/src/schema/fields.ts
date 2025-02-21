import { LEGACY_OID_KEY, OID_KEY } from '../oidsLegacy.js';
import { isObject } from '../utils.js';
import type {
	StorageCollectionSchema,
	StorageFieldSchema,
	StorageFieldsSchema,
} from './types.js';

export function isNullable(field: StorageFieldSchema) {
	if (field.type === 'any') return true;
	if (field.type === 'map') return false;
	return field.nullable;
}

export function hasDefault(field: StorageFieldSchema | undefined) {
	if (!field) return false;
	if (field.type === 'map') return true;
	if (field.type === 'array') return true;
	if (field.type === 'file') return false;
	return field.default !== undefined;
}

export function isRequired(field: StorageFieldSchema) {
	return !isNullable(field) && !hasDefault(field);
}

export function isPrunePoint(field: StorageFieldSchema) {
	return isNullable(field) || hasDefault(field);
}

export function addFieldDefaults(
	collection: StorageCollectionSchema,
	value: any,
) {
	for (const [key, field] of Object.entries(collection.fields)) {
		const defaultValue = getFieldDefault(field);
		if (
			(defaultValue !== undefined && value[key] === undefined) ||
			// covers the case where a previously nullable field
			// now has a default during a new migration
			(!isNullable(field) && value[key] === null)
		) {
			value[key] = defaultValue;
		}
		if (value[key]) {
			traverseCollectionFieldsAndApplyDefaults(value[key], field);
		}
	}
	return value;
}

export function traverseCollectionFieldsAndApplyDefaults(
	value: any,
	field: StorageFieldSchema,
) {
	if (value === undefined || value === null) return value;
	if (field.type === 'object') {
		for (const [key, subField] of Object.entries(
			field.properties as StorageFieldsSchema,
		)) {
			if (value[key] === undefined) {
				const defaultValue = getFieldDefault(subField);
				if (defaultValue !== undefined) {
					value[key] = defaultValue;
				}
			}
			traverseCollectionFieldsAndApplyDefaults(value[key], subField);
		}
	} else if (field.type === 'array') {
		for (const item of value) {
			traverseCollectionFieldsAndApplyDefaults(item, field.items);
		}
	} else if (field.type === 'map') {
		for (const [key, item] of Object.entries(value)) {
			// santiy check to weed out any id field
			if (key === OID_KEY || key === LEGACY_OID_KEY) continue;
			traverseCollectionFieldsAndApplyDefaults(item, field.values);
		}
	}
}

export function getFieldDefault(field: StorageFieldSchema): any {
	if ('default' in field) {
		const val =
			typeof field.default === 'function' ? field.default() : field.default;
		if (val === null) return val;

		const cloned = structuredClone(val);

		if (field.type === 'object') {
			// objects also apply defaults of sub-fields over top of the default object
			for (const [key, property] of Object.entries(
				field.properties as StorageFieldsSchema,
			)) {
				if (cloned[key] === undefined) {
					cloned[key] = getFieldDefault(property);
				}
			}
		}
		return cloned;
	}

	if (isNullable(field)) {
		return null;
	}

	if (field.type === 'array') {
		return [];
	}

	if (field.type === 'map') {
		return {};
	}

	return undefined;
}

export function removeExtraProperties(
	collection: StorageCollectionSchema,
	value: any,
) {
	for (const [key, fieldValue] of Object.entries(value)) {
		// MUST NOT DELETE THESE!
		if (key === OID_KEY || key === LEGACY_OID_KEY) continue;

		if (!collection.fields[key]) {
			delete value[key];
		} else {
			traverseCollectionFieldsAndRemoveExtraProperties(
				fieldValue,
				collection.fields[key],
			);
		}
	}
	return value;
}

export function traverseCollectionFieldsAndRemoveExtraProperties(
	value: any,
	field: StorageFieldSchema,
) {
	if (isObject(value) && field.type === 'object') {
		for (const [key, fieldValue] of Object.entries(value)) {
			if (!field.properties[key]) {
				delete value[key];
			} else {
				traverseCollectionFieldsAndRemoveExtraProperties(
					fieldValue,
					field.properties[key],
				);
			}
		}
	} else if (Array.isArray(value) && field.type === 'array') {
		for (const item of value) {
			traverseCollectionFieldsAndRemoveExtraProperties(item, field.items);
		}
	}
}
