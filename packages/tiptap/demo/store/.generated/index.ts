import { ClientDescriptorOptions } from "./client.js";
export * from "./client.js";
import schema from "./schema.js";
import oldSchemas from "./schemaVersions/index.js";
import { ClientDescriptor as StorageDescriptor } from "./client.js";
import migrations from "../migrations/index.js";
export * from "@verdant-web/store";

export class ClientDescriptor<
  Presence = unknown,
  Profile = unknown,
> extends StorageDescriptor<Presence, Profile> {
  constructor(init: ClientDescriptorOptions<Presence, Profile>) {
    const defaultedSchema = init.schema || schema;
    const defaultedMigrations = init.migrations || migrations;
    const defaultedOldSchemas = init.oldSchemas || oldSchemas;
    super({
      ...init,
      schema: defaultedSchema,
      migrations: defaultedMigrations,
      oldSchemas: defaultedOldSchemas,
    });
  }
}
