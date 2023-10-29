import { getObjectProperty } from '../generators/tools.js';
import * as fs from 'fs/promises';

export function getSchemaVersion(ast) {
	const schema = getSchemaDeclaration(ast);

	return getObjectProperty(schema, 'version').value;
}

/**
 * @returns {import('estree').ObjectExpression}
 */
export function getSchemaDeclaration(ast) {
	const defaultExport = ast.find(
		(node) => node.type === 'ExportDefaultExpression',
	);
	if (!defaultExport) {
		throw new Error('No default export found in schema');
	}

	const schemaCall = defaultExport.expression;
	if (
		schemaCall.type !== 'CallExpression' ||
		schemaCall.callee.value !== 'schema'
	) {
		throw new Error('Default export is not a schema() call');
	}

	return schemaCall.arguments[0].expression;
}

export async function schemasDiffer(schemaOnePath, schemaTwoPath) {
	const [one, two] = await Promise.all([
		fs.readFile(schemaOnePath, 'utf-8'),
		fs.readFile(schemaTwoPath, 'utf-8'),
	]);
	return removeWipFlag(one) !== removeWipFlag(two);
}

function removeWipFlag(schemaFileText) {
	return schemaFileText.replace(/\n\s*wip: true,?/, '');
}

export function getSchemaIsWIP(ast) {
	const schema = getSchemaDeclaration(ast);

	return getObjectProperty(schema, 'wip')?.value ?? false;
}
