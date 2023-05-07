import {
	getFieldDestructuredTyping,
	getFieldInitTyping,
	getFieldSnapshotTyping,
	getSubObjectFieldName,
	parseField,
} from './fields.js';
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
			'Invalid schema file. Must have a default export which is a verdant schema.',
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

export function getCollectionTypings(definition) {
	const fieldsExpression = getObjectProperty(definition, 'fields');
	const fields = objectExpressionEntries(fieldsExpression);

	const name = getObjectProperty(definition, 'name').value;
	const pascalName = changeCase.pascalCase(name);

	let content = '';
	content += getCollectionDocumentTyping(definition);
	content += '\n';
	content += getCollectionFilterTypings(definition);
	content += '\n';
	content += `export type ${pascalName}Destructured = ${getObjectDestructuredTypings(
		name,
		fields,
	)}`;
	content += `export type ${pascalName}Init = ${getObjectInitTypings(
		name,
		fields,
	)}`;
	content += `export type ${pascalName}Snapshot = ${getObjectSnapshotTypings(
		name,
		fields,
	)}`;

	content += `/** ${pascalName} sub-object types */\n\n`;

	for (const [key, value] of fields) {
		content += getObjectTypings(value, getSubObjectFieldName(pascalName, key));
	}

	return content;
}

function getCollectionDocumentTyping(collection) {
	const collectionName = getObjectProperty(collection, 'name').value;
	const pascalName = changeCase.pascalCase(collectionName);

	return `export type ${pascalName} = ObjectEntity<${pascalName}Init, ${pascalName}Destructured>;\n\n`;
}

export function getCollectionPluralName(collection) {
	const collectionName = getObjectProperty(collection, 'name').value;
	const pluralName = getObjectProperty(collection, 'pluralName')?.value;
	return pluralName ?? collectionName + 's';
}

function getObjectTypings(field, name) {
	let content = '';
	const { type, optional, nullable } = parseField(field);
	if (type === 'object' || type === 'array' || type === 'map') {
		if (type === 'object' || type === 'map') {
			content += `export type ${name} = ObjectEntity<${name}Init, ${name}Destructured>;\n`;

			if (type === 'object') {
				const fields = objectExpressionEntries(
					getObjectProperty(field, 'properties'),
				);
				content += `export type ${name}Init = ${getObjectInitTypings(
					name,
					fields,
				)};\n`;
				content += `export type ${name}Destructured = ${getObjectDestructuredTypings(
					name,
					fields,
				)};\n`;
				content += `export type ${name}Snapshot = ${getObjectSnapshotTypings(
					name,
					fields,
				)};\n`;
				for (const [key, value] of fields) {
					content += getObjectTypings(value, getSubObjectFieldName(name, key));
				}
			} else {
				const valueFieldType = getObjectProperty(field, 'values');
				const valueName = getSubObjectFieldName(name, 'Value');
				content += `export type ${name}Init = Record<string, ${valueName}Init>;\n`;
				content += `export type ${name}Destructured = { [key: string]: ${valueName} | undefined };\n`;
				content += `export type ${name}Snapshot = Record<string, ${valueName}Snapshot>;\n`;
				content += getObjectTypings(valueFieldType, valueName);
			}
		} else {
			const itemFieldType = getObjectProperty(field, 'items');
			const itemName = getSubObjectFieldName(name, 'Item');
			content += `export type ${name} = ListEntity<${name}Init, ${name}Destructured>;\n`;
			content += `export type ${name}Init = Array<${itemName}Init>;\n`;
			content += `export type ${name}Destructured = Array<${itemName}>;\n`;
			content += `export type ${name}Snapshot = Array<${itemName}Snapshot>;\n`;
			content +=
				getObjectTypings(itemFieldType, getSubObjectFieldName(name, 'Item')) +
				';';
		}
		content += '\n\n';
	} else if (type === 'file') {
		content += `export type ${name} = EntityFile;\n`;
		content += `export type ${name}Init = File;\n`;
		content += `export type ${name}Destructured = EntityFile;\n`;
		content += `export type ${name}Snapshot = string;\n`;
	} else {
		content += `export type ${name} = ${type}${nullable ? ' | null' : ''};\n`;
		content += `export type ${name}Init = ${name}${
			optional ? ' | undefined' : ''
		};\n`;
		content += `export type ${name}Snapshot = ${name};\n`;
		content += `export type ${name}Destructured = ${name};\n`;
	}

	return content;
}

function getObjectInitTypings(name, fields) {
	return getObjectRecursiveTypings(name, fields, 'Init');
}

function getObjectDestructuredTypings(name, fields) {
	return getObjectRecursiveTypings(name, fields, '', false);
}

function getObjectSnapshotTypings(name, fields) {
	return getObjectRecursiveTypings(name, fields, 'Snapshot', false);
}

function getObjectRecursiveTypings(
	name,
	fields,
	suffix,
	respectOptional = true,
) {
	const pascalName = changeCase.pascalCase(name);
	return `
{
  ${fields
		.map(([key, value]) => {
			const { type, optional, nullable } = parseField(value);
			let content = `${key}${optional && respectOptional ? '?' : ''}: `;
			if (
				type === 'object' ||
				type === 'array' ||
				type === 'map' ||
				type === 'file'
			) {
				content += `${getSubObjectFieldName(pascalName, key)}${suffix}`;
			} else {
				content += type;
			}
			if (nullable) {
				content += ' | null';
			}
			return content;
		})
		.join(';\n')}
}
`;
}
