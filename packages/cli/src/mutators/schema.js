import { getObjectProperty } from '../generators/tools.js';
import { getSchemaDeclaration } from '../readers/schemaInfo.js';
import swc from '@swc/core';
import * as fs from 'fs/promises';

export async function writeSchemaVersion(schemaPath, version) {
	const fileContent = await fs.readFile(schemaPath, 'utf-8');
	const updatedFileContent = fileContent.replace(
		/version: (\d+)/,
		`version: ${version}`,
	);
	await fs.writeFile(schemaPath, updatedFileContent);
}

/**
 * @param {string} schema
 */
export function setWipFlagOnSchemaString(schema) {
	// if wip: true is already set, do nothing
	if (schema.includes('wip: true')) {
		return schema;
	}

	return schema.replace(`schema({`, `schema({ wip: true,`);
}
