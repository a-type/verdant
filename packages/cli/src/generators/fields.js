import { getObjectProperty, objectExpressionEntries } from './tools.js';

export function getFieldSnapshotTyping(field, { flattenArrays = false } = {}) {
	const type = getObjectProperty(field, 'type').value;
	const nullable = getObjectProperty(field, 'nullable')?.value === true;

	let baseType;

	if (type === 'string') {
		baseType = 'string';
	} else if (type === 'number') {
		baseType = 'number';
	} else if (type === 'boolean') {
		baseType = 'boolean';
	} else if (type === 'array') {
		const items = field.properties.find(
			(prop) => prop.key.value === 'items',
		).value;
		if (flattenArrays) {
			baseType = getFieldSnapshotTyping(items, { flattenArrays });
		} else {
			baseType = `Array<${getFieldSnapshotTyping(items)}>`;
		}
	} else if (type === 'object') {
		const properties = objectExpressionEntries(
			field.properties.find((prop) => prop.key.value === 'properties').value,
		);
		baseType = `{
      ${properties
				.map(([key, value]) => `${key}: ${getFieldSnapshotTyping(value)}`)
				.join(',')}
    }`;
	} else if (type === 'map') {
		const values = field.properties.find(
			(prop) => prop.key.value === 'values',
		).value;
		baseType = `Record<string, ${getFieldSnapshotTyping(values)}>`;
	} else if (type === 'any') {
		baseType = 'any';
	} else {
		throw new Error(`Unknown field type: ${type}`);
	}
	return nullable ? `${baseType} | null` : baseType;
}

export function getFieldInitTyping(field) {
	const hasDefault = getObjectProperty(field, 'nullable')?.value === true;
	const baseType = getFieldSnapshotTyping(field);
	return hasDefault ? `${baseType} | undefined` : baseType;
}

export function getAllIndexedFieldsAsMap(collection) {
	const fields = objectExpressionEntries(
		getObjectProperty(collection, 'fields'),
	);
	const indexableFields = fields.filter(
		([, field]) => getObjectProperty(field, 'indexed')?.value === true,
	);
	const synthetics = objectExpressionEntries(
		getObjectProperty(collection, 'synthetics'),
	);
	return new Map([...indexableFields, ...synthetics]);
}

export function getAllFieldsAndSyntheticsAsMap(collection) {
	const fields = objectExpressionEntries(
		getObjectProperty(collection, 'fields'),
	);
	const synthetics = objectExpressionEntries(
		getObjectProperty(collection, 'synthetics'),
	);
	return new Map([...fields, ...synthetics]);
}
