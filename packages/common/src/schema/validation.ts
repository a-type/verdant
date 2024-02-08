import { OID_KEY } from '../oids.js';
import { isObject } from '../utils.js';
import { hasDefault, isNullable } from './fields.js';
import {
	NestedStorageFieldsSchema,
	StorageFieldSchema,
	StorageFieldsSchema,
} from './types.js';

export function validateEntity(
	schema: StorageFieldsSchema,
	entity: any,
): EntityValidationProblem | void {
	for (const [key, value] of Object.entries(entity)) {
		// legacy -- old objects sometimes accidentally include this key
		if (key === OID_KEY) continue;
		if (!schema[key]) {
			return {
				type: 'invalid-key',
				fieldPath: [key],
				message: `Invalid field "${key}"`,
			};
		}
		if (value) {
			const err = validateEntityField({
				field: schema[key],
				value,
				fieldPath: [key],
			});
			if (err) return err;
		}
	}
	return;
}

export type EntityValidationProblem = {
	type:
		| 'null'
		| 'no-default'
		| 'invalid-type'
		| 'invalid-value'
		| 'invalid-key';
	fieldPath: (string | number)[];
	message: string;
};

export function validateEntityField({
	field,
	value,
	fieldPath = [],
	depth,
	requireDefaults,
}: {
	field: StorageFieldSchema;
	value: any;
	fieldPath: (string | number)[];
	depth?: number;
	requireDefaults?: boolean;
}): EntityValidationProblem | undefined {
	if (depth !== undefined && depth <= 0) return;

	if (isNullable(field) && value === null) return;
	if (value === null) {
		if (requireDefaults || !hasDefault(field)) {
			return {
				type: 'no-default',
				fieldPath,
				message: `Invalid null value for field ${formatField(fieldPath)}`,
			};
		}
	}

	if (field.type === 'object') {
		if (!isObject(value)) {
			return {
				type: 'invalid-type',
				fieldPath,
				message: `Expected object${
					field.nullable ? ' or null' : ''
				} for field ${formatField(fieldPath)}, got ${value}`,
			};
		}
		for (const [key, subField] of Object.entries(
			field.properties as NestedStorageFieldsSchema,
		)) {
			// legacy -- old objects sometimes accidentally include this key
			if (key === OID_KEY) continue;
			if (value[key]) {
				validateEntityField({
					field: subField,
					value: value[key],
					fieldPath: [...fieldPath, key],
					depth: depth !== undefined ? depth - 1 : undefined,
				});
			}
		}
		// check for unexpected keys
		for (const key of Object.keys(value)) {
			if (!field.properties[key]) {
				return {
					type: 'invalid-key',
					fieldPath: [...fieldPath, key],
					message: `Invalid unexpected field "${key}" on value ${formatField(
						fieldPath,
					)}`,
				};
			}
		}
	} else if (field.type === 'array') {
		if (!Array.isArray(value)) {
			if (value === null && field.nullable) return;
			return {
				type: 'invalid-value',
				fieldPath,
				message: `Expected array${
					field.nullable ? ' or null' : ''
				} for field ${formatField(fieldPath)}, got ${value}`,
			};
		}
		for (const item of value) {
			validateEntityField({
				field: field.items,
				value: item,
				fieldPath: [...fieldPath, '[]'],
				depth: depth !== undefined ? depth - 1 : undefined,
			});
		}
	} else if (field.type === 'map') {
		if (!isObject(value)) {
			return {
				type: 'invalid-type',
				fieldPath,
				message: `Expected map for field ${formatField(
					fieldPath,
				)}, got ${value}`,
			};
		}
		for (const [key, item] of Object.entries(value)) {
			validateEntityField({
				field: field.values,
				value: item,
				fieldPath: [...fieldPath, key],
				depth: depth !== undefined ? depth - 1 : undefined,
			});
		}
	} else if (field.type === 'string') {
		if (typeof value !== 'string') {
			return {
				type: 'invalid-type',
				fieldPath,
				message: `Expected string ${
					field.nullable ? ' or null' : ''
				} for field ${formatField(fieldPath)}, got ${value}`,
			};
		}
		if (field.options && !field.options.includes(value)) {
			return {
				type: 'invalid-value',
				fieldPath,
				message: `Expected one of ${field.options.join(
					', ',
				)} for field ${formatField(fieldPath)}, got ${value}`,
			};
		}
	} else if (field.type === 'boolean') {
		if (typeof value !== 'boolean') {
			return {
				type: 'invalid-type',
				fieldPath,
				message: `Expected boolean ${
					field.nullable ? ' or null' : ''
				} for field ${formatField(fieldPath)}, got ${value}`,
			};
		}
	} else if (field.type === 'number') {
		if (typeof value !== 'number') {
			return {
				type: 'invalid-type',
				fieldPath,
				message: `Expected number ${
					field.nullable ? ' or null' : ''
				} for field ${formatField(fieldPath)}, got ${value}`,
			};
		}
	} else if (field.type === 'file') {
		// TODO: how?
	}
}

function formatField(fieldPath: (string | number)[]) {
	if (fieldPath.length === 0) return 'root';
	return fieldPath.join('.');
}
