import v1Schema from '../client/schemaVersions/v1.js';
import { createDefaultMigration } from '@verdant-web/store';

// this is your first migration, so no logic is necessary!
export default createDefaultMigration(v1Schema);
