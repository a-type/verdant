import path from 'path/posix';

export function getClientImplementation({
	schemaPath,
	commonjs,
	relativeMigrationsPath,
	javascript,
}: {
	schemaPath: string;
	commonjs?: boolean;
	relativeMigrationsPath: string;
	javascript?: boolean;
}) {
	// TODO: this is pretty messy. time for 2 generators?
	return `import schema from '${schemaPath}${commonjs ? '' : '.js'}';
import { ClientDescriptor as StorageDescriptor } from '${
		javascript ? '@verdant-web/store' : `./client${commonjs ? '' : '.js'}`
	}';
import migrations from '${path.join(
		relativeMigrationsPath,
		`index${commonjs ? '' : '.js'}`,
	)}';
export * from '@verdant-web/store';

export class ClientDescriptor${
		javascript ? '' : '<Presence, Profile>'
	} extends StorageDescriptor${javascript ? '' : '<Presence, Profile>'} {
  constructor(init${
		javascript ? '' : `: ClientDescriptorOptions<Presence, Profile>`
	}) {
    const defaultedSchema = init.schema || schema;
		const defaultedMigrations = init.migrations || migrations;
    super({ ...init, schema: defaultedSchema, migrations: defaultedMigrations });
  }
};
`;
}
