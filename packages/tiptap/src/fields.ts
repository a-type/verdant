import {
	schema,
	ShapeFromProperty,
	StorageAnyFieldSchema,
	StorageArrayFieldSchema,
	StorageNumberFieldSchema,
	StorageObjectFieldSchema,
	StorageStringFieldSchema,
} from '@verdant-web/common';

export type TiptapFieldSchema = StorageObjectFieldSchema<{
	type: StorageStringFieldSchema;
	from: StorageNumberFieldSchema;
	to: StorageNumberFieldSchema;
	attrs: StorageObjectFieldSchema<{
		values: StorageAnyFieldSchema;
	}>;
	content: StorageArrayFieldSchema<TiptapFieldSchema>;
	text: StorageStringFieldSchema;
	marks: StorageArrayFieldSchema<TiptapFieldSchema>;
}>;

export type TipTapFieldInitializer = Pick<
	ShapeFromProperty<TiptapFieldSchema>,
	'type'
> &
	Partial<ShapeFromProperty<TiptapFieldSchema>>;

/**
 * Creates a generic TipTap schema field. You must invoke this and assign it
 * individually to every TipTap document field in your schema, DO NOT reuse
 * the same instance for multiple fields.
 */
export function createTipTapFieldSchema(options: {
	default: TipTapFieldInitializer | null;
}): TiptapFieldSchema {
	if (options.default === undefined) {
		throw new Error(
			'createTiptapFieldSchema requires a default value. Specify "null" to make the field nullable.',
		);
	}

	const baseField = schema.fields.object({
		fields: {},
	});
	const nestedContent = schema.fields.replaceObjectFields(baseField, {
		type: schema.fields.string(),
		from: schema.fields.number({ nullable: true }),
		to: schema.fields.number({ nullable: true }),
		attrs: schema.fields.map({
			values: schema.fields.any(),
		}),
		content: schema.fields.array({
			items: baseField,
		}),
		text: schema.fields.string({ nullable: true }),
		marks: schema.fields.array({
			items: baseField,
		}),
	});

	const rootField = schema.fields.object({
		fields: {
			type: schema.fields.string(),
			from: schema.fields.number({ nullable: true }),
			to: schema.fields.number({ nullable: true }),
			attrs: schema.fields.map({
				values: schema.fields.any(),
			}),
			content: schema.fields.array({
				items: nestedContent,
			}),
			text: schema.fields.string({ nullable: true }),
			marks: schema.fields.array({
				items: nestedContent,
			}),
		},
		default: () => {
			if (options.default === null) {
				return null;
			}
			return structuredClone(options.default);
		},
		nullable: options.default === null,
	});

	return rootField as any;
}
