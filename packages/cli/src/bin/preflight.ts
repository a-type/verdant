import path from 'path';
import { fileExists } from '../fs/exists.js';
import { compareUserSchemaToCanonical } from '../schema.js';

export async function preflight(args: {
	schema: string;
	output: string;
	migrations?: string;
}) {
	const {
		output,
		schema,
		migrations: migrationsOutput = path.resolve(output, '../migrations'),
	} = args;

	// three things to check -
	// 1. is canonical schema WIP
	// 2. is user schema the same as canonical
	// 3. is there a migration for the current version

	const { canonicalIsWip, different, version } =
		await compareUserSchemaToCanonical({ schema, output });
	if (canonicalIsWip) {
		fail(
			'Canonical schema is WIP. Run the CLI to upgrade to a production schema before deploying.',
		);
	}
	if (different) {
		fail(
			'Your schema has uncommitted changes. Use the CLI to generate client code before deploying.',
		);
	}
	if (!(await fileExists(path.join(migrationsOutput, `v${version}.ts`)))) {
		fail(
			`No migration found for current version ${version} (checked the ${migrationsOutput} directory). Use the CLI to generate client code and fill in your migration logic before deploying. If the directory is incorrect, verify you're passing the same parameters to this command as you did to the CLI.`,
		);
	}

	console.info('All checks passed. Ready to deploy your Verdant app!');
	process.exit(0);
}

function fail(message: string) {
	console.error(message);
	process.exit(1);
}
