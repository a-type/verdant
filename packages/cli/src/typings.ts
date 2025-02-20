import {
	CollectionCompoundIndex,
	IndexValueTag,
	StorageCollectionSchema,
	StorageFieldSchema,
	StorageFieldsSchema,
	StorageSchema,
	StorageSyntheticIndexSchema,
	hasDefault,
	isDirectSynthetic,
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
import type { Client as BaseClient, ClientDescriptor as BaseClientDescriptor, ClientDescriptorOptions as BaseClientDescriptorOptions, CollectionQueries, StorageSchema, Migration } from '@verdant-web/store';
export * from '@verdant-web/store';

export class Client<Presence = any, Profile = any> {
  ${Object.entries(schema.collections)
		.map(([plural, collection]) => {
			const name = pascalCase(collection.name);
			return `
			/** Collection access for ${name}. Load queries, put and delete documents. */
			readonly ${plural}: CollectionQueries<${name}, ${name}Init, ${name}Filter>;`;
		})
		.join('\n')}

	/**
	 * Turn on and off sync, or adjust the sync protocol and other settings.
	 */
  sync: BaseClient<Presence, Profile>['sync'];
	/**
	 * Access and manipulate the undo/redo stack. You can also
	 * add custom undoable actions using addUndo, although the interface
	 * for doing this is pretty mind-bending at the moment (sorry).
	 */
  undoHistory: BaseClient<Presence, Profile>['undoHistory'];
	/**
	 * The namespace used to construct this store.
	 */
  namespace: BaseClient<Presence, Profile>['namespace'];
	/**
	 * @deprecated - do not use this. For batching, use .batch instead.
	 * Using methods on this property can cause data loss and corruption.
	 */
  entities: BaseClient<Presence, Profile>['entities'];
  /**
	 * Tools for batching operations so they are bundled together
	 * in the undo/redo stack.
	 */
  batch: BaseClient<Presence, Profile>['batch'];
  close: BaseClient<Presence, Profile>['close'];
	/**
	 * Export a backup of a full library
	 */
  export: BaseClient<Presence, Profile>['export'];
	/**
	 * Import a full library from a backup. WARNING: this replaces
	 * existing data with no option for restore.
	 */
  import: BaseClient<Presence, Profile>['import'];
	/**
	 * Subscribe to global store events
	 */
  subscribe: BaseClient<Presence, Profile>['subscribe'];
	/**
	 * Read stats about storage usage
	 */
  stats: BaseClient<Presence, Profile>['stats'];
	/**
	 * An interface for inspecting and manipulating active live queries.
	 * Particularly, see .keepAlive and .dropKeepAlive for placing keep-alive
	 * holds to keep query results in memory when unsubscribed.
	 */
	queries: BaseClient<Presence, Profile>['queries'];

	/**
	 * Deletes all local data. If the client is connected to sync,
	 * this will cause the client to re-sync all data from the server.
	 * Use this very carefully, and only as a last resort.
	 */
  __dangerous__resetLocal: BaseClient<Presence, Profile>['__dangerous__resetLocal'];

	/**
	 * Export all data, then re-import it. This might resolve
	 * some issues with the local database, but it should
	 * only be done as a second-to-last resort. The last resort
	 * would be __dangerous__resetLocal on ClientDescriptor, which
	 * clears all local data.
	 *
	 * Unlike __dangerous__resetLocal, this method allows local-only
	 * clients to recover data, whereas __dangerous__resetLocal only
	 * lets networked clients recover from the server.
	 */
	__dangerous__hardReset: () => Promise<void>;

	/**
	 * Manually triggers storage rebasing. Follows normal
	 * rebasing rules. Rebases already happen automatically
	 * during normal operation, so you probably don't need this.
	 */
	__manualRebase: () => Promise<void>;
}

export interface ClientDescriptorOptions<Presence = any, Profile = any> extends Omit<BaseClientDescriptorOptions<Presence, Profile>, 'schema' | 'migrations' | 'oldSchemas'> {
  /** WARNING: overriding the schema is dangerous and almost definitely not what you want. */
  schema?: StorageSchema;
	/** WARNING: overriding old schemas is dangerous and almost definitely not what you want. */
	oldSchemas?: StorageSchema[];
	/** WARNING: overriding the migrations is dangerous and almost definitely not what you want. */
	migrations?: Migration[];
}

export class ClientDescriptor<Presence = any, Profile = any> {
  constructor(init: ClientDescriptorOptions<Presence, Profile>);
  open: () => Promise<Client<Presence, Profile>>;
  close: () => Promise<void>;
  readonly current: Client<Presence, Profile> | null;
  readonly readyPromise: Promise<Client<Presence, Profile>>;
  readonly schema: StorageSchema;
  readonly namespace: string;
	/**
	 * Resets all local data for this client, including the schema and migrations.
	 * If the client is not connected to sync, this causes the irretrievable loss of all data.
	 * If the client is connected to sync, this will cause the client to re-sync all data from the server.
	 * Use this very carefully, and only as a last resort.
	 */
	__dangerous__resetLocal: () => Promise<void>;
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
			`import { ObjectEntity, ListEntity, EntityFile, EntityFileSnapshot } from '@verdant-web/store';\n`,
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
			nullable: isNullable(field),
		});
		declarations += fieldTypings.declarations;
	});
	return [
		aliasBuilder(name + suffix, builder.build()).build(),
		declarations,
	].join('\n');
}

type CyclicReference = {
	$ref: string;
};

function cyclicToName(cyclic: CyclicReference) {
	const parts = cyclic['$ref'].split('[').map((s) => s.replace(/]$/, ''));
	// first 4 parts are $, collections, [name], fields
	// from then on, it will alternate between a field name and the
	// property of the field definition which indicates nesting,
	// i.e. 'foo' -> 'fields' -> 'bar' -> 'items' ...
	// so we can just take the odd parts and join them
	return parts
		.slice(4)
		.filter((_, i) => i % 2 === 0)
		.map((s) => pascalCase(s))
		.join('');
}

function getFieldTypings({
	name,
	field,
	suffix,
	childSuffix = suffix,
	mode,
}: {
	name: string;
	field: StorageFieldSchema | CyclicReference;
	suffix: string;
	childSuffix?: string;
	mode: 'init' | 'snapshot' | 'destructured';
}): { alias: string; optional?: boolean; declarations: string } {
	if ('$ref' in field) {
		return {
			alias: cyclicToName(field) + suffix,
			declarations: '',
		};
	}

	const optionals = mode === 'init';
	const optional = optionals && (isNullable(field) || hasDefault(field));
	switch (field.type) {
		case 'string':
			if (field.options) {
				return {
					alias: `(${field.options.map((s) => `'${s}'`).join(' | ')})`,
					optional,
					declarations: '',
				};
			}
		case 'number':
		case 'boolean':
		case 'any':
			return {
				alias: field.type,
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
							: 'EntityFileSnapshot'
				}`,
				optional,
				declarations: '',
			};
		case 'object':
			let declarations = '';
			const objBuilder = recordBuilder();
			for (const [key, subfield] of Object.entries(
				field.properties as StorageFieldsSchema,
			)) {
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
					nullable: isNullable(subfield),
				});
				declarations += subfieldTypings.declarations;
			}
			return {
				alias: name + childSuffix,
				optional,
				declarations:
					declarations +
					'\n' +
					aliasBuilder(name + suffix, objBuilder.build()).build(),
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
			if (field.options) {
				return aliasBuilder(
					name,
					'(' + field.options.map((s) => `'${s}'`).join(' | ') + ')',
					field.documentation,
				).build();
			}
			return aliasBuilder(name, field.type, field.documentation).build();
		case 'number':
		case 'boolean':
			return aliasBuilder(name, field.type, field.documentation).build();
		case 'array':
			const itemName = `${name}Item`;
			const itemTypings = getEntityFieldTypings({
				name: itemName,
				field: field.items,
			});
			const baseList = aliasBuilder(
				name,
				`ListEntity<${name}Init, ${name}Destructured, ${name}Snapshot>`,
				field.documentation,
			).build();
			return [baseList, itemTypings].join('\n');
		case 'object':
			const subtypes = new Array<string>();
			Object.entries(field.properties as StorageFieldsSchema).forEach(
				([key, field]) => {
					const fieldName = `${name}${pascalCase(key)}`;
					subtypes.push(getEntityFieldTypings({ name: fieldName, field }));
				},
			);
			return [
				aliasBuilder(
					name,
					`ObjectEntity<${name}Init, ${name}Destructured, ${name}Snapshot>`,
					field.documentation,
				).build(),
				...subtypes,
			].join('\n');
		case 'any':
			return aliasBuilder(name, 'any', field.documentation).build();
		case 'file':
			return aliasBuilder(name, 'EntityFile', field.documentation).build();
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
					field.documentation,
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
		// transitional... until fully dropping 'indexed'
		if ('indexed' in field) {
			filters.push(
				...getFieldFilterTypings({
					field,
					key,
					name: `${name}${pascalCase(key)}`,
					collection,
				}),
			);
		}
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
	const primaryKeyField = collection.fields[collection.primaryKey];
	if (primaryKeyField) {
		const filters = getFieldFilterTypings({
			field: primaryKeyField,
			key: collection.primaryKey,
			name: `${name}${pascalCase(collection.primaryKey)}`,
			collection,
		});
		// I guess it's possible primaryKey is also marked 'indexed'
		if (!filters.some((f) => f.name === filters[0].name)) {
			filters.push(...filters);
		}
	}
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
			name: `${name}SortFilter`,
			typing: `export interface ${name}SortFilter {
	where: "${key}";
	order: "asc" | "desc";
	};`,
		},
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
