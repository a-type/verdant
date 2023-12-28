import { ClientDescriptorOptions } from "./client";
export * from "./client";
import schema from "./schema";
import { ClientDescriptor as StorageDescriptor } from "./client";
import migrations from "../migrations/index";
export * from "@verdant-web/store";

export class ClientDescriptor<
  Presence = unknown,
  Profile = unknown,
> extends StorageDescriptor<Presence, Profile> {
  constructor(init: ClientDescriptorOptions<Presence, Profile>) {
    const defaultedSchema = init.schema || schema;
    const defaultedMigrations = init.migrations || migrations;
    super({
      ...init,
      schema: defaultedSchema,
      migrations: defaultedMigrations,
    });
  }
}
