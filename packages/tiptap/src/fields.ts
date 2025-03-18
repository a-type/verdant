import {
	schema,
	ShapeFromProperty,
	StorageAnyFieldSchema,
	StorageArrayFieldSchema,
	StorageMapFieldSchema,
	StorageNumberFieldSchema,
	StorageObjectFieldSchema,
	StorageStringFieldSchema,
} from '@verdant-web/common';
import { ListEntity, ObjectEntity } from '@verdant-web/store';

export type TiptapFieldSchema = StorageObjectFieldSchema<{
	type: StorageStringFieldSchema;
	from: StorageNumberFieldSchema & { nullable: true };
	to: StorageNumberFieldSchema & { nullable: true };
	attrs: StorageMapFieldSchema<StorageAnyFieldSchema>;
	content: StorageArrayFieldSchema<TiptapFieldSchema> & { nullable: true };
	text: StorageStringFieldSchema & { nullable: true };
	marks: StorageArrayFieldSchema<TiptapFieldSchema> & { nullable: true };
}>;

type PartialNull<T> = {
	[K in keyof T]?: T[K] | null;
};

export type TipTapFieldInitializer = Pick<
	ShapeFromProperty<TiptapFieldSchema>,
	'type'
> &
	PartialNull<ShapeFromProperty<TiptapFieldSchema>>;

export type TipTapAttrsEntity = ObjectEntity<
	{ [key: string]: any },
	{ [key: string]: any },
	{ [key: string]: any }
>;
export type TipTapContentEntity = ListEntity<
	TipTapFieldInitializer[],
	TipTapDocumentEntity[],
	ShapeFromProperty<TiptapFieldSchema>[]
>;
/**
 * NOTE: it's not recommended to use this type directly. Instead rely on the generated
 * types from the Verdant CLI.
 */
export type TipTapDocumentEntity = ObjectEntity<
	TipTapFieldInitializer,
	{
		type: string;
		from: number | null;
		to: number | null;
		attrs: TipTapAttrsEntity;
		content: TipTapContentEntity;
		text: string | null;
		marks: TipTapContentEntity;
	},
	ShapeFromProperty<TiptapFieldSchema>
>;

const otherDefaults = {
	content: [],
	marks: null,
	attrs: {},
	from: null,
	to: null,
	text: null,
};

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
			nullable: true,
		}),
		text: schema.fields.string({ nullable: true }),
		marks: schema.fields.array({
			items: baseField,
			nullable: true,
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
				nullable: true,
			}),
			text: schema.fields.string({ nullable: true }),
			marks: schema.fields.array({
				items: nestedContent,
				nullable: true,
			}),
		},
		default: () => {
			if (options.default === null) {
				return null;
			}
			return { ...otherDefaults, ...structuredClone(options.default) };
		},
		nullable: options.default === null,
	});

	return rootField as any;
}

export function createTipTapFileMapSchema() {
	return schema.fields.map({
		values: schema.fields.file(),
	});
}
