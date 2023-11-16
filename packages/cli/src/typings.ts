import {
	CollectionCompoundIndex,
	IndexValueTag,
	StorageCollectionSchema,
	StorageFieldSchema,
	StorageSchema,
	StorageSyntheticIndexSchema,
	hasDefault,
	isDirectSynthetic,
	isIndexed,
	isNullable,
} from '@verdant-web/common';
import { pascalCase } from 'change-case';
import { aliasBuilder, arrayBuilder, recordBuilder } from './typingBuilder.js';

export function getAllTypings({ schema }: { schema: StorageSchema }) {
	const schemaTypings = getSchemaTypings({ schema });
	const clientTypings = getClientTypings({ schema });
	return `${clientTypings}\n${schemaTypings}`;
}

export function getClientTypings({ schema }: { schema: StorageSchema }) {
	const typings = `/** Generated types for Verdant client */
import type { Client as BaseClient, ClientDescriptor as BaseClientDescriptor, ClientDescriptorOptions as BaseClientDescriptorOptions, CollectionQueries, StorageSchema, Migration, EntityFile } from '@verdant-web/store';
export * from '@verdant-web/store';

export class Client<Presence = any, Profile = any> {
  ${Object.entries(schema.collections)
		.map(([plural, collection]) => {
			const name = pascalCase(collection.name);
			return `readonly ${plural}: CollectionQueries<${name}, ${name}Init, ${name}Filter>;`;
		})
		.join('\n')}

  sync: BaseClient<Presence, Profile>['sync'];
  undoHistory: BaseClient<Presence, Profile>['undoHistory'];
  namespace: BaseClient<Presence, Profile>['namespace'];
  entities: BaseClient<Presence, Profile>['entities'];
  queryStore: BaseClient<Presence, Profile>['queryStore'];
  batch: BaseClient<Presence, Profile>['batch'];
  files: BaseClient<Presence, Profile>['files'];
  close: BaseClient<Presence, Profile>['close'];
  export: BaseClient<Presence, Profile>['export'];
  import: BaseClient<Presence, Profile>['import'];
  subscribe: BaseClient<Presence, Profile>['on'];
  stats: BaseClient<Presence, Profile>['stats'];
  __dangerous__resetLocal: BaseClient<Presence, Profile>['__dangerous__resetLocal'];
}

export interface ClientDescriptorOptions<Presence = any, Profile = any> extends Omit<BaseClientDescriptorOptions<Presence, Profile>, 'schema' | 'migrations'> {
  /** WARNING: overriding the schema is dangerous and almost definitely not what you want. */
  schema?: StorageSchema;
	/** WARNING: overriding the migrations is dangerous and almost definitely not what you want. */
	migrations?: Migration[];
}

export class ClientDescriptor<Presence = any, Profile = any> {
  constructor(init: ClientInitOptions<Presence, Profile>);
  open: () => Promise<Client<Presence, Profile>>;
  close: () => Promise<void>;
  readonly current: Client<Presence, Profile> | null;
  readonly readyPromise: Promise<Client<Presence, Profile>>;
  readonly schema: StorageSchema;
  readonly namespace: string;
}
`;
	return typings;
}

export function getSchemaTypings({ schema }: { schema: StorageSchema }) {
	const types = Object.entries(schema.collections)
		.map(([plural, collection]) => {
			return getCollectionTypings(collection);
		})
		.reduce(
			(acc, curr) => acc + '\n\n' + curr,
			`import { ObjectEntity, ListEntity, EntityFile } from '@verdant-web/store';\n`,
		);
	return types;
}

export function getCollectionTypings(collection: StorageCollectionSchema) {
	const name = pascalCase(collection.name);
	return `/** Generated types for ${name} */

${getEntityTypings({ collection })}
${getInitTypings({ collection })}
${getDestructuredTypings({ collection })}
${getSnapshotTypings({ collection })}

/** Index filters for ${name} **/

${getFilterTypings({ name, collection })}
`;
}

function getTypings({
	collection,
	suffix,
	childSuffix = suffix,
	mode,
}: {
	collection: StorageCollectionSchema;
	suffix: string;
	childSuffix?: string;
	mode: 'init' | 'snapshot' | 'destructured';
}) {
	const name = pascalCase(collection.name);
	let declarations = '';
	const builder = recordBuilder();
	Object.entries(collection.fields).forEach(([key, field]) => {
		const fieldName = `${name}${pascalCase(key)}`;
		const fieldTypings = getFieldTypings({
			name: fieldName,
			field,
			suffix,
			childSuffix,
			mode,
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
	mode,
}: {
	name: string;
	field: StorageFieldSchema;
	suffix: string;
	childSuffix?: string;
	mode: 'init' | 'snapshot' | 'destructured';
}): { alias: string; optional?: boolean; declarations: string } {
	const optionals = mode === 'init';
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
				alias: `${
					mode === 'init'
						? 'File'
						: mode === 'destructured'
						? 'EntityFile'
						: 'string'
				}${field.nullable ? ' | null' : ''}`,
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
					mode,
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
						.nullable(mode !== 'destructured' && !!field.nullable)
						.build(),
			};
		case 'array':
			const itemName = `${name}Item`;
			const itemTypings = getFieldTypings({
				name: itemName,
				field: field.items,
				suffix,
				childSuffix,
				mode,
			});
			const baseList = aliasBuilder(
				name + suffix,
				arrayBuilder(itemTypings.alias).build(),
			)
				.nullable(mode !== 'destructured' && !!field.nullable)
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
				mode,
			});
			const baseMap = recordBuilder()
				.withField({
					key: '[key: string]',
					type:
						valueName +
						childSuffix +
						// map values are optional in destructured type,
						// indicating to the user that they can't rely on
						// any particular value being present at a key.
						(mode === 'destructured' ? ' | undefined' : ''),
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

export function getSnapshotTypings({
	collection,
}: {
	collection: StorageCollectionSchema;
}) {
	return getTypings({ collection, suffix: 'Snapshot', mode: 'snapshot' });
}

export function getInitTypings({
	collection,
}: {
	collection: StorageCollectionSchema;
}) {
	return getTypings({
		collection,
		suffix: 'Init',
		mode: 'init',
	});
}

export function getDestructuredTypings({
	collection,
}: {
	collection: StorageCollectionSchema;
}) {
	return getTypings({
		collection,
		suffix: 'Destructured',
		// children point to entities
		childSuffix: '',
		mode: 'destructured',
	});
}

export function getEntityTypings({
	collection,
}: {
	collection: StorageCollectionSchema;
}) {
	const name = pascalCase(collection.name);
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
			)
				.nullable(!!field.nullable)
				.build();
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
				)
					.nullable(!!field.nullable)
					.build(),
				...subtypes,
			].join('\n');
		case 'any':
			return aliasBuilder(name, 'any').build();
		case 'file':
			return aliasBuilder(name, 'string').nullable(!!field.nullable).build();
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

export function getFilterTypings({
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
				collection,
			}),
		);
	});
	Object.entries(collection.indexes ?? {}).forEach(([key, field]) => {
		filters.push(
			...getFieldFilterTypings({
				field,
				key,
				name: `${name}${pascalCase(key)}`,
				collection,
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
	if (filters.length === 0) {
		return `export type ${name}Filter = never;`;
	}
	return `${filters.map((filter) => filter.typing).join('\n')}
  export type ${name}Filter = ${filters
		.map((filter) => filter.name)
		.join(' | ')};`;
}

function getFieldOrIndexType({
	fieldOrIndex,
	collection,
}: {
	fieldOrIndex: StorageFieldSchema | StorageSyntheticIndexSchema<any>;
	collection: StorageCollectionSchema;
}): IndexValueTag {
	if (isDirectSynthetic(fieldOrIndex)) {
		return getFieldOrIndexType({
			fieldOrIndex: collection.fields[fieldOrIndex.field],
			collection,
		});
	}
	if (
		fieldOrIndex.type === 'object' ||
		fieldOrIndex.type === 'array' ||
		fieldOrIndex.type === 'map' ||
		fieldOrIndex.type === 'any' ||
		fieldOrIndex.type === 'file'
	) {
		throw new Error(
			`Cannot create filter typings for field or index type ${fieldOrIndex.type}`,
		);
	}
	return fieldOrIndex.type;
}

function getFieldFilterTypings({
	field,
	name,
	key,
	collection,
}: {
	field: StorageFieldSchema | StorageSyntheticIndexSchema<any>;
	collection: StorageCollectionSchema;
	name: string;
	key: string;
}) {
	let fieldType = getFieldOrIndexType({ fieldOrIndex: field, collection });
	if (fieldType.endsWith('[]')) {
		fieldType = fieldType.slice(0, -2) as IndexValueTag;
	}

	let filters = [
		{
			typing: `export interface ${name}MatchFilter {
  where: "${key}";
  equals: ${fieldType};
  order?: "asc" | "desc";
      };`,
			name: `${name}MatchFilter`,
		},
		{
			typing: `export interface ${name}RangeFilter {
        where: "${key}";
        gte?: ${fieldType};
        gt?: ${fieldType};
        lte?: ${fieldType};
        lt?: ${fieldType};
        order?: "asc" | "desc";
      };`,
			name: `${name}RangeFilter`,
		},
	];
	if (fieldType === 'string' || fieldType === 'string[]') {
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
					const value =
						collection.fields[field] ||
						collection.indexes?.[field] ||
						collection.synthetics?.[field];
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

export function getMigrationTypings({ schema }: { schema: StorageSchema }) {
	const record = recordBuilder();
	for (const [name, collection] of Object.entries(schema.collections)) {
		record.withField({
			key: name,
			type: recordBuilder()
				.withField({
					key: 'init',
					type: `${pascalCase(collection.name)}Init`,
				})
				.withField({
					key: 'snapshot',
					type: `${pascalCase(collection.name)}Snapshot`,
				})
				.build(),
		});
	}
	return aliasBuilder('MigrationTypes', record.build()).build();
}
