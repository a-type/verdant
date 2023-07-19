import schema from "./schema.js";
import { Storage, StorageDescriptor } from "@verdant-web/store";
export * from "@verdant-web/store";

export const Client = Storage;
export class ClientDescriptor extends StorageDescriptor {
  constructor(init) {
    const defaultedSchema = init.schema || schema;
    super({ ...init, schema: defaultedSchema });
  }
}
