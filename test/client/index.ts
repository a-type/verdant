export * from '@verdant-web/store';
export * from './client.js';
import migrations from '../migrations/index.js';
import { Client as BaseClient, type ClientInitOptions } from './client.js';
import schema from './schema.js';
import oldSchemas from './schemaVersions/index.js';

export class Client<Presence = unknown, Profile = unknown> extends BaseClient<
	Presence,
	Profile
> {
	constructor(init: ClientInitOptions<Presence, Profile>) {
		const defaultedSchema = init.schema || schema;
		const defaultedMigrations = init.migrations || migrations;
		const defaultedOldSchemas = init.oldSchemas || oldSchemas;
		if (init.migrations) {
			console.log(
				'⚠️ Using custom migrations, default migrations are being overridden',
			);
		}
		if (init.oldSchemas) {
			console.log(
				'⚠️ Using custom oldSchemas, default oldSchemas are being overridden',
			);
		}
		if (init.schema) {
			console.log('⚠️ Using custom schema, default schema is being overridden');
		}
		super({
			...init,
			schema: defaultedSchema,
			migrations: defaultedMigrations,
			oldSchemas: defaultedOldSchemas,
		});
	}
}
