import { createHooks as baseCreateHooks } from "@verdant-web/react";
import schema from "./schema.js";

export function createHooks(options) {
  return baseCreateHooks(schema, options);
}
