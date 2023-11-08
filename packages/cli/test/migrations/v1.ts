import v1Schema, {
	MigrationTypes as V1Types,
} from '../.generated/schemaVersions/v1.js';
import { createMigration } from '@verdant-web/store';

// this is your first migration, so no logic is necessary!
export default createMigration<V1Types>(v1Schema, async ({ mutations }) => {
	// for version 1, there isn't any data to modify, but you can
	// still use mutations to seed initial data here.
});
