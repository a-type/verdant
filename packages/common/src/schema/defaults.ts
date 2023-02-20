import { LEGACY_OID_KEY, OID_KEY } from '../oids.js';
import type { StorageFieldSchema, StorageCollectionSchema } from './types.js';

export function addFieldDefaults(
	collection: StorageCollectionSchema,
	value: any,
) {
	for (const [key, field] of Object.entries(collection.fields)) {
		const defaultValue = getFieldDefault(field);
		if (defaultValue !== undefined && value[key] === undefined) {
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
		for (const [key, subField] of Object.entries(field.properties)) {
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
	return undefined;
}
