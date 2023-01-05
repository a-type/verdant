import v1Schema from "../client/schemaVersions/v1.js";
import { migrate } from "@lo-fi/web";

// this is your first migration, so no logic is necessary!
export default migrate(v1Schema, async ({ mutations }) => {
  // for version 1, there isn't any data to modify, but you can
  // still use mutations to seed initial data here.
});
