import { StorageFieldSchema, StorageFieldsSchema } from './types.js';

export function getChildFieldSchema(
	schema: StorageFieldSchema | StorageFieldsSchema,
	key: string | number,
): StorageFieldSchema | null {
	if (schema.type === 'object') {
		return schema.properties[key];
	} else if (schema.type === 'array') {
		return schema.items;
	} else if (schema.type === 'map') {
		return schema.values;
	} else if (schema.type === 'any') {
		return schema;
	} else if (!('type' in schema)) {
		return schema[key] ?? null;
	}
	return null;
}
