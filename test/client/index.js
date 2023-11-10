import schema from "./schema.js";
import { ClientDescriptor as StorageDescriptor } from "@verdant-web/store";
export * from "@verdant-web/store";

export class ClientDescriptor extends StorageDescriptor {
  constructor(init) {
    const defaultedSchema = init.schema || schema;
    super({ ...init, schema: defaultedSchema });
  }
}
