/** @generated - do not modify this file. */

// schema.ts
import { schema } from "@verdant-web/store";
var items = schema.collection({
  name: "item",
  primaryKey: "id",
  fields: {
    id: schema.fields.string({
      default: () => Math.random().toString(36).slice(2, 9)
    }),
    content: schema.fields.string({
      default: ""
    }),
    tags: schema.fields.array({
      items: schema.fields.string({
        options: ["a", "b", "c"]
      })
    }),
    purchased: schema.fields.boolean({
      default: false
    }),
    categoryId: schema.fields.string({
      nullable: true
    }),
    comments: schema.fields.array({
      items: schema.fields.object({
        properties: {
          id: schema.fields.string({
            default: () => Math.random().toString(36).slice(2, 9)
          }),
          content: schema.fields.string({
            default: ""
          }),
          authorId: schema.fields.string()
        }
      })
    }),
    image: schema.fields.file({
      nullable: true
    })
  },
  indexes: {
    categoryId: {
      field: "categoryId"
    },
    purchasedYesNo: {
      type: "string",
      compute(item) {
        return item.purchased ? "yes" : "no";
      }
    }
  }
});
var categories = schema.collection({
  name: "category",
  pluralName: "categories",
  primaryKey: "id",
  fields: {
    id: schema.fields.string({
      default: () => Math.random().toString(36).slice(2, 9)
    }),
    name: schema.fields.string(),
    metadata: schema.fields.object({
      nullable: true,
      properties: {
        color: schema.fields.string()
      }
    })
  },
  indexes: {
    name: {
      field: "name"
    }
  }
});
var schema_default = schema({
  version: 1,
  collections: {
    items,
    categories
  }
});
export {
  schema_default as default
};
