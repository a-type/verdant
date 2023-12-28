/** @generated - do not modify this file. */

// src/schema.ts
import { schema, collection } from "@verdant-web/store";
var pages = collection({
  name: "page",
  primaryKey: "id",
  fields: {
    id: {
      type: "string",
      default: "default"
    },
    version: {
      type: "number"
    },
    shapes: {
      type: "map",
      values: {
        type: "any"
      }
    },
    bindings: {
      type: "map",
      values: {
        type: "any"
      }
    },
    assets: {
      type: "map",
      values: {
        type: "object",
        properties: {
          id: {
            type: "string"
          },
          type: {
            type: "string"
          },
          size: {
            type: "array",
            items: {
              type: "number"
            }
          },
          name: {
            type: "string",
            nullable: true
          },
          src: {
            type: "string",
            nullable: true
          }
        }
      }
    }
  }
});
var assets = collection({
  name: "asset",
  primaryKey: "id",
  fields: {
    id: {
      type: "string"
    },
    file: {
      type: "file"
    }
  }
});
var schema_default = schema({
  version: 1,
  collections: {
    pages,
    assets
  }
});
export {
  schema_default as default
};
