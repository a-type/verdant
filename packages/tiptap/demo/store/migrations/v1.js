import v1Schema from "../.generated/schemaVersions/v1.js";
import { createMigration } from "@verdant-web/store";
// this is your first migration, so no logic is necessary! but you can
// include logic here to seed initial data for users
export default createMigration(v1Schema, async ({ mutations }) => {
    // await mutations.post.create({ title: 'Welcome to my app!' });
});
//# sourceMappingURL=v1.js.map