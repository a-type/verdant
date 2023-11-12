import { StorageSchema, isDirectSynthetic } from '@verdant-web/common';
import * as z from 'zod';

// read schemas replace functions with a string literal
const functionValidator = z.literal('FUNCTION');

// enforcing typing isn't really important here
const fieldValidator: z.ZodType<any> = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('string'),
		default: z.union([z.string(), functionValidator]).optional(),
		nullable: z.boolean().optional(),
	}),
	z.object({
		type: z.literal('number'),
		default: z.union([z.number(), functionValidator]).optional(),
		nullable: z.boolean().optional(),
	}),
	z.object({
		type: z.literal('boolean'),
		default: z.union([z.boolean(), functionValidator]).optional(),
		nullable: z.boolean().optional(),
	}),
	z.object({
		type: z.literal('object'),
		properties: z.object({}).catchall(z.lazy(() => fieldValidator)),
		nullable: z.boolean().optional(),
	}),
	z.object({
		type: z.literal('array'),
		items: z.lazy(() => fieldValidator),
		nullable: z.boolean().optional(),
	}),
	z.object({ type: z.literal('map'), values: z.lazy(() => fieldValidator) }),
	z.object({ type: z.literal('any'), default: z.any().optional() }),
	z.object({
		type: z.literal('file'),
		nullable: z.boolean().optional(),
		downloadRemote: z.boolean().optional(),
	}),
]);

const indexValidator = z
	.object({ field: z.string() })
	.or(
		z.discriminatedUnion('type', [
			z.object({ type: z.literal('string'), compute: functionValidator }),
			z.object({ type: z.literal('number'), compute: functionValidator }),
			z.object({ type: z.literal('boolean'), compute: functionValidator }),
			z.object({ type: z.literal('string[]'), compute: functionValidator }),
			z.object({ type: z.literal('number[]'), compute: functionValidator }),
			z.object({ type: z.literal('boolean[]'), compute: functionValidator }),
		]),
	);

const schemaValidator = z.object({
	version: z.number().positive(),
	collections: z.object({}).catchall(
		z.object({
			name: z.string(),
			primaryKey: z.string(),
			fields: z.object({}).catchall(fieldValidator),
			indexes: z.object({}).catchall(indexValidator).optional(),
			compounds: z
				.object({})
				.catchall(
					z.object({
						of: z.array(z.string()),
					}),
				)
				.optional(),
			// deprecated
			synthetics: z.object({}).catchall(indexValidator).optional(),
			pluralName: z.string().optional(),
		}),
	),
});

export function validateSchema(schema: StorageSchema) {
	schemaValidator.parse(schema);
	// also validate:
	for (const collection of Object.values(schema.collections)) {
		// primaryKey is a primitive field
		if (!collection.fields[collection.primaryKey]) {
			throw new Error(
				`Collection ${collection.name} has no field ${collection.primaryKey} defined for its primaryKey. Add a field named "${collection.primaryKey}" to the fields object or change the primaryKey value.`,
			);
		} else if (
			!['string', 'number', 'boolean'].includes(
				collection.fields[collection.primaryKey].type,
			)
		) {
			throw new Error(
				`Collection ${collection.name} has a primaryKey field named ${collection.primaryKey} that is not a primitive type. Primary keys must be a string, number, or boolean.`,
			);
		}
		// both "synthetics" and "indexes" aren't used together
		if (collection.synthetics && collection.indexes) {
			throw new Error(
				`Collection ${collection.name} has both "synthetics" and "indexes" defined. Use "indexes" for all indexes instead.`,
			);
		}
		// there aren't indexes and compounds of the same name
		const allIndexes = {
			...collection.synthetics,
			...collection.indexes,
		};
		const indexNames = Object.keys(allIndexes);
		const compoundNames = Object.keys(collection.compounds ?? {});
		const duplicateIndexNames = indexNames.filter((name) =>
			compoundNames.includes(name),
		);
		if (duplicateIndexNames.length) {
			throw new Error(
				`Collection ${
					collection.name
				} has indexes and compounds with the same name: ${duplicateIndexNames.join(
					', ',
				)}. Indexes and compounds must have unique names.`,
			);
		}
		// all indexes of fields reference real fields
		for (const [name, index] of Object.entries(allIndexes)) {
			if (isDirectSynthetic(index) && !collection.fields[index.field]) {
				throw new Error(
					`Collection ${collection.name} has an index named "${name}" that references a field named "${index.field}" that does not exist.`,
				);
			}
		}
		for (const [name, index] of Object.entries(collection.compounds ?? {})) {
			for (const fieldName of index.of) {
				if (!collection.fields[fieldName]) {
					throw new Error(
						`Collection ${collection.name} has a compound index named "${name}" that references a field named "${fieldName}" that does not exist.`,
					);
				}
			}
		}
	}
}
