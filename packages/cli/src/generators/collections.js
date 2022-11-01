import { getFieldInitTyping, getFieldSnapshotTyping } from './fields.js';
import { getObjectProperty, objectExpressionEntries } from './tools.js';
import * as path from 'path';
import * as changeCase from 'change-case';
import { getCollectionFilterTypings } from './filters.js';

export function getAllCollectionDefinitions(ast) {
	const defaultExportExpression = ast.find(
		(node) => node.type === 'ExportDefaultExpression',
	)?.expression;
	if (
		!defaultExportExpression ||
		defaultExportExpression.callee.value !== 'schema'
	) {
		throw new Error(
			'Invalid schema file. Must have a default export which is a lo-fi schema.',
		);
	}
	const schema = defaultExportExpression.arguments[0].expression;
	const collections = schema.properties.find(
		(prop) => prop.key.value === 'collections',
	);
	const collectionKeyValues = collections.value.properties;
	const collectionDefinitions = {};
	for (const collection of collectionKeyValues) {
		// support, in order: shorthand, variable reference, literal
		const valueExpression =
			collection.type === 'Identifier'
				? lookupCollection(ast, collection.value)
				: collection.value.type === 'Identifier'
				? lookupCollection(ast, collection.value.value)
				: collection.value;
		const name = collection.key ? collection.key.value : collection.value;
		collectionDefinitions[name] = valueExpression.arguments[0].expression;
	}
	return collectionDefinitions;
}

function lookupCollection(ast, name) {
	let declaration = ast.find((node) => {
		if (
			node.type === 'VariableDeclaration' &&
			node.declarations[0].id.value === name
		)
			return true;
		if (
			node.type === 'ExportDeclaration' &&
			node.declaration.declarations[0].id.value === name
		)
			return true;
		return false;
	});
	if (declaration) {
		if (declaration.type === 'ExportDeclaration') {
			declaration = declaration.declaration;
		}
		return declaration.declarations[0].init;
	}
}

export function getCollectionTypings(name, definition) {
	const fieldsExpression = getObjectProperty(definition, 'fields');
	const fields = objectExpressionEntries(fieldsExpression);

	const pascalName = changeCase.pascalCase(name);

	let content = '';
	content += getCollectionSnapshotTyping(definition);
	content += getCollectionInitTyping(definition);
	content += getCollectionDocumentTyping(definition);
	content += getCollectionSubObjectTypings(definition);
	content += getCollectionFilterTypings(definition);

	return content;
}

function getCollectionDocumentTyping(collection) {
	const collectionName = getObjectProperty(collection, 'name').value;
	const pascalName = changeCase.pascalCase(collectionName);

	return `export type ${pascalName} = ObjectEntity<${pascalName}Init>;\n\n`;
}

function getCollectionSnapshotTyping(collection) {
	const collectionName = getObjectProperty(collection, 'name').value;
	const pascalName = changeCase.pascalCase(collectionName);

	const fieldsExpression = getObjectProperty(collection, 'fields');
	const fields = objectExpressionEntries(fieldsExpression);

	return `
export interface ${pascalName}Snapshot {
  ${fields
		.map(([key, value]) => `${key}: ${getFieldSnapshotTyping(value)}`)
		.join(';\n')}
}
`;
}

function getCollectionInitTyping(collection) {
	const collectionName = getObjectProperty(collection, 'name').value;
	const pascalName = changeCase.pascalCase(collectionName);

	const fieldsExpression = getObjectProperty(collection, 'fields');
	const fields = objectExpressionEntries(fieldsExpression);

	return `
export interface ${pascalName}Init {
  ${fields
		.map(([key, value]) => {
			const { type, optional } = getFieldInitTyping(value);
			return `${key}${optional ? '?' : ''}: ${type}`;
		})
		.join(';\n')}
}
`;
}

export function getCollectionPluralName(collection) {
	const collectionName = getObjectProperty(collection, 'name').value;
	const pluralName = getObjectProperty(collection, 'pluralName')?.value;
	return pluralName ?? collectionName + 's';
}

function getCollectionSubObjectTypings(collection) {
	const fields = objectExpressionEntries(
		getObjectProperty(collection, 'fields'),
	);
	const baseName = getObjectProperty(collection, 'name').value;
	return getSubObjectFieldTypings(fields, changeCase.pascalCase(baseName));
}

function getSubObjectFieldTypings(fields, parentName) {
	let content = '';
	for (const [key, value] of fields) {
		const type = getObjectProperty(value, 'type').value;
		if (type === 'object') {
			const subName = parentName + changeCase.pascalCase(key);
			content += `export type ${subName} = ObjectEntity<${getFieldSnapshotTyping(
				value,
			)}>;\n\n`;
			const fieldValue = getObjectProperty(value, 'properties');
			content += getSubObjectFieldTypings(
				objectExpressionEntries(fieldValue),
				subName,
			);
		} else if (type === 'array') {
			const subName = parentName + changeCase.pascalCase(key);
			content += `export type ${subName} = ListEntity<${getFieldSnapshotTyping(
				value,
				{ flattenArrays: true },
			)}>;\n\n`;
			const fieldValue = getObjectProperty(value, 'items');
			content += getSubObjectFieldTypings([['item', fieldValue]], subName);
		} else if (type === 'map') {
			const subName = parentName + changeCase.pascalCase(key) + 'Value';
			content += `export type ${subName} = ObjectEntity<Record<string, ${getFieldSnapshotTyping(
				value,
			)}>>;\n\n`;
			const fieldValue = getObjectProperty(value, 'values');
			content += getSubObjectFieldTypings(
				objectExpressionEntries(fieldValue),
				subName,
			);
		}
	}
	return content;
}
