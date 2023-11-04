import {
	StorageCollectionSchema,
	StorageFieldSchema,
	StorageSchema,
} from '@verdant-web/common';
import { pascalCase } from 'change-case';
import { aliasBuilder, interfaceBuilder } from './typingBuilder.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import prettier from 'prettier';

export async function writeSchemaTypings({
	schema,
	output,
}: {
	schema: StorageSchema;
	output: string;
}) {
	const types = Object.entries(schema.collections)
		.map(([plural, collection]) => {
			return getCollectionTypings(collection);
		})
		.reduce((acc, curr) => acc + '\n\n' + curr, '');
	await fs.writeFile(path.join(output, 'client.d.ts'), types);
}

export function getCollectionTypings(collection: StorageCollectionSchema) {
	const name = pascalCase(collection.name);
	return prettier.format(
		`/** Generated types for ${name} */

${getSnapshotTypings({ name, collection })}

`,
		{
			parser: 'babel',
		},
	);
}

function getSnapshotTypings({
	name,
	collection,
}: {
	name: string;
	collection: StorageCollectionSchema;
}) {
	const fieldTypings = new Array<string>();
	const baseSnapshot = interfaceBuilder(`${name}Snapshot`)
		.withFields(
			Object.entries(collection.fields).map(([key, field]) => {
				const fieldName = `${name}${pascalCase(key)}`;
				fieldTypings.push(getFieldSnapshotTypings({ name: fieldName, field }));
				return [key, fieldName + 'Snapshot'];
			}),
		)
		.build();
	return [baseSnapshot, ...fieldTypings].join('\n');
}

/** Recursively evaluates snapshot typings for a field */
function getFieldSnapshotTypings({
	name,
	field,
}: {
	name: string;
	field: StorageFieldSchema;
}): string {
	switch (field.type) {
		case 'string':
		case 'number':
		case 'boolean':
			return aliasBuilder(name + 'Snapshot', field.type).build();
		case 'array':
			const itemName = `${name}Item`;
			const itemTypings = getFieldSnapshotTypings({
				name: itemName,
				field: field.items,
			});
			const baseList = aliasBuilder(
				name + 'Snapshot',
				`${itemName}Snapshot[]`,
			).build();
			return [baseList, itemTypings].join('\n');
		case 'object':
			const subtypes = new Array<string>();
			const baseObject = interfaceBuilder(name + 'Snapshot')
				.withFields(
					Object.entries(field.properties).map(([key, field]) => {
						const fieldName = `${name}${pascalCase(key)}`;
						subtypes.push(getFieldSnapshotTypings({ name: fieldName, field }));
						return [key, fieldName + 'Snapshot'];
					}),
				)
				.build();
			return [baseObject, ...subtypes].join('\n');
		case 'any':
			return aliasBuilder(name + 'Snapshot', 'any').build();
		case 'file':
			return aliasBuilder(name + 'Snapshot', 'File').build();
		case 'map':
			const valueName = `${name}Value`;
			const valueTypings = getFieldSnapshotTypings({
				name: valueName,
				field: field.values,
			});
			const baseMap = interfaceBuilder(name + 'Snapshot')
				.withField('[key: string]', valueName + 'Snapshot')
				.build();
			return [baseMap, valueTypings].join('\n');
		default:
			throw new Error(`Unknown field type: ${(field as any).type}`);
	}
}

function getInitTypings({
	name,
	collection,
}: {
	name: string;
	collection: StorageCollectionSchema;
}) {}

function getEntityTypings({
	name,
	collection,
}: {
	name: string;
	collection: StorageCollectionSchema;
}) {}

function getDestructuredTypings({
	name,
	collection,
}: {
	name: string;
	collection: StorageCollectionSchema;
}) {}
