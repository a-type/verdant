import { pascalCase } from 'change-case';
import {
	getAllFieldsAndSyntheticsAsMap,
	getFieldSnapshotTyping,
} from './fields.js';
import { getObjectProperty } from './tools.js';

/**
 * @param {import('estree').ObjectExpression} collection
 */
export function getCollectionFilterTypings(collection) {
	const collectionName = getObjectProperty(collection, 'name').value;
	const fields = getObjectProperty(collection, 'fields');
	const compounds = getObjectProperty(collection, 'compounds');
	const synthetics = getObjectProperty(collection, 'synthetics');

	let filterTypings = [];
	for (const field of fields.properties) {
		if (getObjectProperty(field.value, 'indexed')?.value) {
			filterTypings.push(
				...getCollectionFieldFilterTypings(collection, false, field.key.value),
			);
		}
	}
	for (const compound of compounds?.properties ?? []) {
		filterTypings.push(
			...getCollectionCompoundFilterTypings(collection, compound.key.value),
		);
	}
	for (const synthetic of synthetics?.properties ?? []) {
		filterTypings.push(
			...getCollectionFieldFilterTypings(collection, true, synthetic.key.value),
		);
	}
	const filterUnion = filterTypings.map(({ name }) => name).join(' | ');
	if (!filterTypings.length) {
		return `
		export type ${pascalCase(collectionName)}Filter = never;`;
	}
	return `
${filterTypings.map(({ typing }) => typing).join('\n')}
export type ${pascalCase(collectionName)}Filter = ${filterUnion};
`;
}

function getCollectionFieldFilterTypings(collection, isSynthetic, name) {
	const collectionName = getObjectProperty(collection, 'name').value;
	const fields = getObjectProperty(
		collection,
		isSynthetic ? 'synthetics' : 'fields',
	);
	const field = getObjectProperty(fields, name);
	const fieldType = getObjectProperty(field, 'type').value;
	const fieldTyping = getFieldSnapshotTyping(field);
	const matchName = `${pascalCase(collectionName)}${pascalCase(
		name,
	)}MatchFilter`;
	const rangeName = `${pascalCase(collectionName)}${pascalCase(
		name,
	)}RangeFilter`;
	const filters = [
		{
			name: matchName,
			typing: `
export interface ${matchName} {
  where: '${name}';
  equals: ${fieldTyping};
  order?: 'asc' | 'desc';
}
`,
		},
		{
			name: rangeName,
			typing: `
export interface ${rangeName} {
  where: '${name}';
  gte?: ${fieldTyping};
  gt?: ${fieldTyping};
  lte?: ${fieldTyping};
  lt?: ${fieldTyping};
  order?: 'asc' | 'desc';
}
`,
		},
	];
	if (fieldType === 'string') {
		filters.push({
			name: `${pascalCase(collectionName)}${pascalCase(name)}StartsWithFilter`,
			typing: `
export interface ${pascalCase(collectionName)}${pascalCase(
				name,
			)}StartsWithFilter {
					where: '${name}';
					startsWith: string;
					order?: 'asc' | 'desc';
			}`,
		});
	}
	return filters;
}

function getCollectionCompoundFilterTypings(collection, name) {
	const collectionName = getObjectProperty(collection, 'name').value;
	const compounds = getObjectProperty(collection, 'compounds');
	const compound = getObjectProperty(compounds, name);

	const ofFields = getObjectProperty(compound, 'of');
	const indexableFields = getAllFieldsAndSyntheticsAsMap(collection);

	const filterName = `${pascalCase(collectionName)}${pascalCase(
		name,
	)}CompoundFilter`;

	return [
		{
			name: filterName,
			typing: `
export interface ${filterName} {
  where: '${name}';
  match: {
    ${ofFields.elements
			.map(({ expression }) => {
				const name = expression.value;
				const ofField = indexableFields.get(name);
				return `${name}?: ${getFieldSnapshotTyping(ofField, {
					flattenArrays: true,
				})}`;
			})
			.join(';\n')}
  };
  order: 'asc' | 'desc';
}
`,
		},
	];
}
