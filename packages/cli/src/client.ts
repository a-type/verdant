export function getClientImplementation({
	schemaPath,
	migrationsOutput,
	commonjs,
}: {
	schemaPath: string;
	migrationsOutput: string;
	commonjs?: boolean;
}) {
	return `import schema from '${schemaPath}${commonjs ? '' : '.js'}';
import * as migrations from '${migrationsOutput}/index${commonjs ? '' : '.js'}';
import { ClientDescriptor as StorageDescriptor } from '@verdant-web/store';
export * from '@verdant-web/store';

export class ClientDescriptor extends StorageDescriptor {
  constructor(init) {
    const defaultedSchema = init.schema || schema;
    const defaultedMigrations = init.migrations || migrations;
    super({ ...init, schema: defaultedSchema, migrations: defaultedMigrations });
  }
};
`;
}
