import v1Schema, {
  MigrationTypes as V1Types,
} from "../client/schemaVersions/v1.js";
import { createMigration } from "@verdant-web/store";

// this is your first migration, so no logic is necessary!
export default createMigration<V1Types>(v1Schema);
