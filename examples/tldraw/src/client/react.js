import { createHooks as baseCreateHooks } from "@verdant-web/react";
import schema from "./schema";

export function createHooks() {
  return baseCreateHooks(schema);
}
