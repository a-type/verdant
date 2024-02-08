import { LEGACY_OID_KEY, OID_KEY } from '../oids.js';
import { isObject } from '../utils.js';
import type {
	StorageFieldSchema,
	StorageCollectionSchema,
	NestedStorageFieldsSchema,
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

export function getDefault(field: StorageFieldSchema | undefined) {
	if (!field || !hasDefault(field)) return undefined;
	if (field.type === 'file') {
		if (isNullable(field)) return null;
		return undefined;
	}
	if (field.type === 'map') return {};
	if (field.type === 'array') {
		if (isNullable(field)) return null;
		return [];
	}
	if (field.type === 'object') {
		if (isNullable(field)) return null;
		return undefined;
	}
	if (typeof field.default === 'function') {
		return field.default();
	}
	return field.default;
}

export function isPrunePoint(field: StorageFieldSchema) {
	return isNullable(field) || hasDefault(field);
}

/** @deprecated */
export function isIndexed(field: StorageFieldSchema) {
	if (field.type === 'map') return false;
	if (field.type === 'object') return false;
	if (field.type === 'array') return false;
	if (field.type === 'file') return false;
	if (field.type === 'any') return false;
	return field.indexed;
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
			field.properties as NestedStorageFieldsSchema,
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

export function getFieldDefault(field: StorageFieldSchema) {
	if (
		field.type === 'string' ||
		field.type === 'number' ||
		field.type === 'boolean' ||
		field.type === 'any'
	) {
		if (field.default && typeof field.default === 'function') {
			return field.default();
		} else if (field.default !== undefined) {
			// TODO: structuredClone?
			return JSON.parse(JSON.stringify(field.default));
		}
	}
	if (field.type === 'array') {
		return [];
	}
	if (field.type === 'map') {
		return {};
	}
	if (field.type !== 'any' && field.nullable) {
		return null;
	}
	if (field.type === 'object' && field.default) {
		const defaultValue =
			// @ts-ignore
			typeof field.default === 'function'
				? field.default()
				: JSON.parse(JSON.stringify(field.default));
		for (const [key, property] of Object.entries(
			field.properties as NestedStorageFieldsSchema,
		)) {
			if (defaultValue[key] === undefined) {
				defaultValue[key] = getFieldDefault(property);
			}
		}
		return defaultValue;
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
