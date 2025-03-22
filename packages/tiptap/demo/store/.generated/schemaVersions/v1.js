/** @generated - do not modify this file. */

// demo/store/schema.ts
import { schema as schema2 } from "@verdant-web/common";

// src/fields.ts
import {
  schema
} from "@verdant-web/common";
var otherDefaults = {
  content: [],
  marks: null,
  attrs: {},
  from: null,
  to: null,
  text: null
};
function createTipTapFieldSchema(options) {
  if (options.default === void 0) {
    throw new Error(
      'createTiptapFieldSchema requires a default value. Specify "null" to make the field nullable.'
    );
  }
  const baseField = schema.fields.object({
    fields: {}
  });
  const nestedContent = schema.fields.replaceObjectFields(baseField, {
    type: schema.fields.string(),
    from: schema.fields.number({ nullable: true }),
    to: schema.fields.number({ nullable: true }),
    attrs: schema.fields.map({
      values: schema.fields.any()
    }),
    content: schema.fields.array({
      items: baseField,
      nullable: true
    }),
    text: schema.fields.string({ nullable: true }),
    marks: schema.fields.array({
      items: baseField,
      nullable: true
    })
  });
  const rootField = schema.fields.object({
    fields: {
      type: schema.fields.string(),
      from: schema.fields.number({ nullable: true }),
      to: schema.fields.number({ nullable: true }),
      attrs: schema.fields.map({
        values: schema.fields.any()
      }),
      content: schema.fields.array({
        items: nestedContent,
        nullable: true
      }),
      text: schema.fields.string({ nullable: true }),
      marks: schema.fields.array({
        items: nestedContent,
        nullable: true
      })
    },
    default: () => {
      if (options.default === null) {
        return null;
      }
      return { ...otherDefaults, ...structuredClone(options.default) };
    },
    nullable: options.default === null
  });
  return rootField;
}
function createTipTapFileMapSchema() {
  return schema.fields.map({
    values: schema.fields.file()
  });
}

// demo/store/schema.ts
var schema_default = schema2({
  version: 1,
  collections: {
    posts: schema2.collection({
      name: "post",
      primaryKey: "id",
      fields: {
        id: schema2.fields.id(),
        nullableBody: createTipTapFieldSchema({ default: null }),
        requiredBody: createTipTapFieldSchema({
          default: {
            type: "doc",
            content: []
          }
        }),
        files: createTipTapFileMapSchema()
      }
    })
  }
});
export {
  schema_default as default
};
