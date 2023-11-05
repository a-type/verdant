import {
	CollectionCompoundIndex,
	CompoundIndexValue,
	StorageCollectionSchema,
	StorageFieldSchema,
	StorageSchema,
	StorageSyntheticIndexSchema,
	hasDefault,
	isIndexed,
	isNullable,
} from '@verdant-web/common';
import { pascalCase } from 'change-case';
import { aliasBuilder, arrayBuilder, recordBuilder } from './typingBuilder.js';
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
		.reduce(
			(acc, curr) => acc + '\n\n' + curr,
			`import { ObjectEntity, ListEntity } from '@verdant-web/store';\n`,
		);
	await fs.writeFile(path.join(output, 'client.d.ts'), types);
}

export function getCollectionTypings(collection: StorageCollectionSchema) {
	const name = pascalCase(collection.name);
	return prettier.format(
		`/** Generated types for ${name} */

${getEntityTypings({ name, collection })}
${getInitTypings({ name, collection })}
${getDestructuredTypings({ name, collection })}
${getSnapshotTypings({ name, collection })}
${getFilterTypings({ name, collection })}
`,
		{
			parser: 'babel',
		},
	);
}

function getTypings({
	name,
	collection,
	suffix,
	childSuffix = suffix,
	optionals,
}: {
	name: string;
	collection: StorageCollectionSchema;
	suffix: string;
	childSuffix?: string;
	optionals: boolean;
}) {
	let declarations = '';
	const builder = recordBuilder();
	Object.entries(collection.fields).forEach(([key, field]) => {
		const fieldName = `${name}${pascalCase(key)}`;
		const fieldTypings = getFieldTypings({
			name: fieldName,
			field,
			suffix,
			childSuffix,
			optionals,
		});
		builder.withField({
			key,
			type: fieldTypings.alias,
			optional: fieldTypings.optional,
		});
		declarations += fieldTypings.declarations;
	});
	return [
		aliasBuilder(name + suffix, builder.build()).build(),
		declarations,
	].join('\n');
}

function getFieldTypings({
	name,
	field,
	suffix,
	childSuffix = suffix,
	optionals,
}: {
	name: string;
	field: StorageFieldSchema;
	suffix: string;
	childSuffix?: string;
	optionals: boolean;
}): { alias: string; optional?: boolean; declarations: string } {
	const optional = optionals && (isNullable(field) || hasDefault(field));
	switch (field.type) {
		case 'string':
		case 'number':
		case 'boolean':
		case 'any':
			return {
				alias: field.type + (isNullable(field) ? ' | null' : ''),
				optional,
				declarations: '',
			};
		case 'file':
			return {
				alias: `string${field.nullable ? ' | null' : ''}`,
				optional,
				declarations: '',
			};
		case 'object':
			let declarations = '';
			const objBuilder = recordBuilder();
			for (const [key, subfield] of Object.entries(field.properties)) {
				const fieldName = `${name}${pascalCase(key)}`;
				const subfieldTypings = getFieldTypings({
					name: fieldName,
					field: subfield,
					suffix,
					childSuffix,
					optionals,
				});
				objBuilder.withField({
					key,
					type: subfieldTypings.alias,
					optional: subfieldTypings.optional,
				});
				declarations += subfieldTypings.declarations;
			}
			return {
				alias: name + childSuffix,
				optional,
				declarations:
					declarations +
					'\n' +
					aliasBuilder(name + suffix, objBuilder.build())
						.nullable(!!field.nullable)
						.build(),
			};
		case 'array':
			const itemName = `${name}Item`;
			const itemTypings = getFieldTypings({
				name: itemName,
				field: field.items,
				suffix,
				childSuffix,
				optionals,
			});
			const baseList = aliasBuilder(
				name + suffix,
				arrayBuilder(itemTypings.alias).build(),
			)
				.nullable(!!field.nullable)
				.build();
			return {
				alias: name + childSuffix,
				optional,
				declarations: itemTypings.declarations + '\n' + baseList,
			};
		case 'map':
			const valueName = `${name}Value`;
			const valueTypings = getFieldTypings({
				name: valueName,
				field: field.values,
				suffix,
				childSuffix,
				optionals,
			});
			const baseMap = recordBuilder()
				.withField({
					key: '[key: string]',
					type: valueName + childSuffix,
				})
				.build();
			return {
				alias: name + childSuffix,
				optional,
				declarations:
					valueTypings.declarations +
					'\n' +
					aliasBuilder(name + suffix, baseMap).build(),
			};
		default:
			throw new Error(`Unknown field type: ${(field as any).type}`);
	}
}

function getSnapshotTypings({
	name,
	collection,
}: {
	name: string;
	collection: StorageCollectionSchema;
}) {
	return getTypings({ name, collection, suffix: 'Snapshot', optionals: false });
}

function getInitTypings({
	name,
	collection,
}: {
	name: string;
	collection: StorageCollectionSchema;
}) {
	return getTypings({
		name,
		collection,
		suffix: 'Init',
		optionals: true,
	});
}

function getDestructuredTypings({
	name,
	collection,
}: {
	name: string;
	collection: StorageCollectionSchema;
}) {
	return getTypings({
		name,
		collection,
		suffix: 'Destructured',
		// children point to entities
		childSuffix: '',
		optionals: false,
	});
}

function getEntityTypings({
	name,
	collection,
}: {
	name: string;
	collection: StorageCollectionSchema;
}) {
	let types = `export type ${name} = ObjectEntity<${name}Init, ${name}Destructured, ${name}Snapshot>;`;
	for (const [key, field] of Object.entries(collection.fields)) {
		const fieldName = `${name}${pascalCase(key)}`;
		types += `\n${getEntityFieldTypings({
			name: fieldName,
			field,
		})};`;
	}
	return types;
}

function getEntityFieldTypings({
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
			return aliasBuilder(name, field.type).build();
		case 'array':
			const itemName = `${name}Item`;
			const itemTypings = getEntityFieldTypings({
				name: itemName,
				field: field.items,
			});
			const baseList = aliasBuilder(
				name,
				`ListEntity<${name}Init, ${name}Destructured, ${name}Snapshot>`,
			).build();
			return [baseList, itemTypings].join('\n');
		case 'object':
			const subtypes = new Array<string>();
			Object.entries(field.properties).forEach(([key, field]) => {
				const fieldName = `${name}${pascalCase(key)}`;
				subtypes.push(getEntityFieldTypings({ name: fieldName, field }));
			});
			return [
				aliasBuilder(
					name,
					`ObjectEntity<${name}Init, ${name}Destructured, ${name}Snapshot>`,
				).build(),
				...subtypes,
			].join('\n');
		case 'any':
			return aliasBuilder(name, 'any').build();
		case 'file':
			return aliasBuilder(name, 'string').build();
		case 'map':
			const valueName = `${name}Value`;
			const valueTypings = getEntityFieldTypings({
				name: valueName,
				field: field.values,
			});
			return [
				aliasBuilder(
					name,
					`ObjectEntity<${name}Init, ${name}Destructured, ${name}Snapshot>`,
				).build(),
				valueTypings,
			].join('\n');
		default:
			throw new Error(`Unknown field type: ${(field as any).type}`);
	}
}

function getFilterTypings({
	collection,
	name,
}: {
	collection: StorageCollectionSchema;
	name: string;
}) {
	let filters = new Array<{ typing: string; name: string }>();
	Object.entries(collection.fields).forEach(([key, field]) => {
		if (!isIndexed(field)) return;
		filters.push(
			...getFieldFilterTypings({
				field,
				key,
				name: `${name}${pascalCase(key)}`,
			}),
		);
	});
	Object.entries(collection.synthetics || {}).forEach(([key, field]) => {
		filters.push(
			...getFieldFilterTypings({
				field,
				key,
				name: `${name}${pascalCase(key)}`,
			}),
		);
	});
	Object.entries(collection.compounds || {}).forEach(([key, index]) => {
		filters.push(
			getCompoundFilterTypings({
				index,
				collection,
				key,
				name: `${name}${pascalCase(key)}`,
			}),
		);
	});
	return `${filters.map((filter) => filter.typing).join('\n')}
  export type ${name}Filter = ${filters
		.map((filter) => filter.name)
		.join(' | ')};`;
}

function getFieldFilterTypings({
	field,
	name,
	key,
}: {
	field: StorageFieldSchema | StorageSyntheticIndexSchema<any>;
	name: string;
	key: string;
}) {
	if (
		field.type === 'object' ||
		field.type === 'array' ||
		field.type === 'map' ||
		field.type === 'any' ||
		field.type === 'file'
	) {
		throw new Error(
			`Cannot create filter typings for field type ${field.type}`,
		);
	}
	let filters = [
		{
			typing: `export interface ${name}MatchFilter {
  where: "${key}";
  equals: ${field.type};
  order?: "asc" | "desc";
      };`,
			name: `${name}MatchFilter`,
		},
		{
			typing: `export interface ${name}RangeFilter {
        where: "${key}";
        gte?: ${field.type};
        gt?: ${field.type};
        lte?: ${field.type};
        lt?: ${field.type};
        order?: "asc" | "desc";
      };`,
			name: `${name}RangeFilter`,
		},
	];
	if (field.type === 'string' || field.type === 'string[]') {
		filters.push({
			typing: `export interface ${name}StartsWithFilter {
        where: "${key}";
        startsWith: string;
        order?: "asc" | "desc";
      };`,
			name: `${name}StartsWithFilter`,
		});
	}
	return filters;
}

function getCompoundFilterTypings({
	index,
	collection,
	name,
	key,
}: {
	index: CollectionCompoundIndex<any, any>;
	collection: StorageCollectionSchema;
	name: string;
	key: string;
}) {
	return {
		typing: `export interface ${name}CompoundFilter {
    where: '${key}';
    match: {
      ${index.of
				.map((field, index) => {
					const value = collection.fields[field];
					if (!value)
						throw new Error(
							`Cannot find field ${field} in collection ${collection.name} when evaluating compound index ${name}`,
						);
					if (value.type === 'array') {
						if (
							value.items.type === 'string' ||
							value.items.type === 'number' ||
							value.items.type === 'boolean'
						) {
							return `${field}${index > 0 ? '?' : ''}: ${value.items.type};`;
						} else {
							throw new Error(
								`Cannot create filter typings for field type ${value.items.type}[]`,
							);
						}
					} else if (
						value.type === 'object' ||
						value.type === 'any' ||
						value.type === 'file'
					) {
						throw new Error(
							`Cannot create filter typings for field type ${value.type}`,
						);
					}
					return `${field}${index > 0 ? '?' : ''}: ${value.type}${
						isNullable(value) ? ' | null' : ''
					};`;
				})
				.join('\n')}
    };
    order?: 'asc' | 'desc';
  }`,
		name: `${name}CompoundFilter`,
	};
}
