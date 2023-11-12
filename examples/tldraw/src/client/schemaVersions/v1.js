/** @generated - do not modify this file. */

// src/client/schemaVersions/v1.js
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
          type: {
            type: "string"
          },
          size: {
            type: "array",
            items: {
              type: "number"
            }
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
var v1_default = schema({
  version: 1,
  collections: {
    pages,
    assets
  }
});
var finalSchema = { wip: void 0, ...v1_default };
var schema_default = finalSchema;

// src/client/schema.js
var finalSchema2 = { wip: void 0, ...schema_default };
var schema_default2 = finalSchema2;
export {
  schema_default2 as default
};
