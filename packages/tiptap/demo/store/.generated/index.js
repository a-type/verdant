export * from "./client.js";
import schema from "./schema.js";
import oldSchemas from "./schemaVersions/index.js";
import { ClientDescriptor as StorageDescriptor } from "./client.js";
import migrations from "../migrations/index.js";
export * from "@verdant-web/store";
export class ClientDescriptor extends StorageDescriptor {
    constructor(init) {
        const defaultedSchema = init.schema || schema;
        const defaultedMigrations = init.migrations || migrations;
        const defaultedOldSchemas = init.oldSchemas || oldSchemas;
        super(Object.assign(Object.assign({}, init), { schema: defaultedSchema, migrations: defaultedMigrations, oldSchemas: defaultedOldSchemas }));
    }
}
//# sourceMappingURL=index.js.map