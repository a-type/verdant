import { confirm, intro, isCancel, outro, select } from '@clack/prompts';
import path from 'path';
import { generateClientCode } from '../codegen.js';
import { isCommonJS } from '../env.js';
import { openInCode } from '../fs/code.js';
import { copy } from '../fs/copy.js';
import { makeDir } from '../fs/makedir.js';
import { rm } from '../fs/rm.js';
import { tempDir } from '../fs/tempDir.js';
import { upsertMigration } from '../migrations.js';
import {
	bumpUserSchemaVersion,
	compareUserSchemaToCanonical,
	writeSchema,
} from '../schema.js';
import { needsUpgrade, upgrade } from '../upgrade.js';

function log(...messages: any[]) {
	console.log('│ ');
	console.log('│ ', ...messages);
}

/**
 * The CLI helps manage schema versions and generate client code.
 *
 * Client code is structured as follows:
 * /index.js - the client implementation
 * /index.d.ts - the client typings
 * /react.js - the react implementation (if enabled)
 * /react.d.ts - the react typings (if enabled)
 * /schema.js - the compiled (bundled) canonical client schema
 * /schemaVersions/ - a directory of all historical schemas...
 * /schemaVersions/1.js - a historical compiled schema
 * /schemaVersions/1.d.ts - typings related to that historical schema
 *
 * To update files, the CLI creates a temporary directory in CWD and
 * creates all new files there. It then copies the contents to their
 * respective locations in the output directory. If the CLI exits with
 * a non-0 code, the temp directory is left in place for debugging if
 * debug = true.
 */
export async function generate({
	schema,
	output,
	react = false,
	debug = false,
	migrations: migrationsOutput = path.resolve(output, '../migrations'),
}: {
	schema: string;
	output: string;
	react?: boolean;
	debug?: boolean;
	migrations?: string;
}) {
	intro('🌿 Verdant CLI');

	// setup temp layer
	await makeDir(output);
	await makeDir(migrationsOutput);
	const tempLayer = await tempDir('temp-', !debug);
	const outputRelativeToCwd = path.relative(process.cwd(), output);
	const migrationsRelativeToCwd = path.relative(
		process.cwd(),
		migrationsOutput,
	);
	const tempOutput = path.resolve(tempLayer, outputRelativeToCwd);
	const tempMigrations = path.resolve(tempLayer, migrationsRelativeToCwd);
	await makeDir(tempOutput);
	await makeDir(tempMigrations);

	const commonjs = await isCommonJS();

	const upgradeNeeded = await needsUpgrade({ output });
	if (upgradeNeeded) {
		try {
			log(
				'ℹ️  Your generated code needs an upgrade to the latest CLI version.',
			);
			log(
				'   This upgrade will increase the type safety of mutations and let you break your schema into modules and utilize reusable schema fields from libraries.',
			);
			log(
				'   This upgrade will modify your existing migrations to use new migration tools. You will need to check them to be sure everything is correct.',
			);
			log('   Learn more at https://verdant.so/docs/cli#upgrading');
			await upgrade({ output, migrations: migrationsOutput, commonjs });
		} catch (err) {
			console.error(
				`Your generated code needs an upgrade to the latest version, but the upgrade failed.`,
			);
			console.error(err);
			process.exit(1);
		}
	}

	const {
		different: userSchemaDifferent,
		novel: userSchemaNovel,
		version: userSchemaVersion,
		canonicalIsWip,
	} = await compareUserSchemaToCanonical({
		schema,
		output,
	});

	let selection: 'wip' | 'publish' | 'exit' | 'force' | 'regenerate' | symbol;
	let newSchemaVersion = userSchemaVersion;
	if (userSchemaNovel) {
		// first schema with this new version (might also be first schema)
		selection = await select({
			message: `New schema version ${userSchemaVersion}. Choose a way to proceed:`,
			options: [
				{
					value: 'wip',
					label: `🏗️  Start a new WIP schema for version ${userSchemaVersion}`,
				},
				{
					value: 'publish',
					label: `📦  Publish a new schema version ${userSchemaVersion}`,
				},
				{
					value: 'exit',
					label: `🚪 Exit (do nothing)`,
				},
			],
		});
	} else if (userSchemaDifferent) {
		if (canonicalIsWip) {
			selection = await select({
				message: `A WIP schema for version ${userSchemaVersion} is in progress. Choose a way to proceed:`,
				options: [
					{
						value: 'wip',
						label: `🏗️  Refresh current WIP version ${userSchemaVersion}`,
					},
					{
						value: 'publish',
						label: `📦  Publish the final schema for version ${userSchemaVersion}`,
					},
					{
						value: 'exit',
						label: `🚪 Exit (do nothing)`,
					},
				],
			});
		} else {
			selection = await select({
				message: `Schema version ${userSchemaVersion} already exists and yours is different. Choose a way to proceed:`,
				options: [
					{
						value: 'wip',
						label: `🏗️  Start a new WIP schema for version ${
							userSchemaVersion + 1
						}`,
					},
					{
						value: 'publish',
						label: `📦  Publish a new schema version ${userSchemaVersion + 1}`,
					},
					{
						value: 'exit',
						label: `🚪 Exit (do nothing)`,
					},
					{
						value: 'force',
						label: `⚠️  Overwrite production schema for version ${userSchemaVersion}`,
					},
				],
			});

			// for new schemas, we bump the version in the user's schema file first thing
			if (selection === 'wip' || selection === 'publish') {
				try {
					await bumpUserSchemaVersion({ path: schema });
					log(`⬆️  Bumped schema version to ${userSchemaVersion + 1}`);
					newSchemaVersion = userSchemaVersion + 1;
				} catch (err) {
					console.error(err);
					process.exit(1);
				}
			}
		}
	} else {
		selection = 'regenerate';
		log(`Your schema is up-to-date. Regenerating client code...`);
	}

	if (isCancel(selection) || selection === 'exit') {
		outro('🚪 Exiting');
		process.exit(0);
	}

	if (selection === 'force') {
		const confirmOverwrite = await confirm({
			message: `Are you sure you want to overwrite version ${userSchemaVersion}? ⛔ If you already deployed this version, user data will get corrupted. ⛔`,
			active: `I have not deployed version ${userSchemaVersion} yet`,
			inactive: `I have already deployed version ${userSchemaVersion}`,
		});
		if (isCancel(confirmOverwrite)) {
			outro('Bye!');
			process.exit(0);
		}
		if (!confirmOverwrite) {
			outro(
				`ℹ️ Run the command again and select either "Start a new WIP version" or "Publish a new version" to start version ${
					userSchemaVersion + 1
				}. If you really want to override version ${userSchemaVersion}, you will have to lie to me.`,
			);
			process.exit(0);
		}
	}

	let migrationCreated = false;
	if (selection === 'wip' || selection === 'publish' || selection === 'force') {
		await writeSchema({
			schemaPath: schema,
			output: tempOutput,
			wip: selection === 'wip',
			commonjs,
		});

		log(
			`✨ Applied new${
				selection === 'wip' ? ' WIP' : ''
			} schema: version ${newSchemaVersion}`,
		);
	}

	await generateClientCode({
		schema,
		output: tempOutput,
		react,
		commonjs,
		migrationsOutput,
	});
	migrationCreated = await upsertMigration({
		version: newSchemaVersion,
		migrationsOutput: tempMigrations,
		commonjs,
		relativeSchemasPath: path
			.relative(
				path.resolve(migrationsOutput),
				path.resolve(output, 'schemaVersions'),
			)
			.replaceAll(path.win32.sep, path.posix.sep),
		migrationsDirectory: migrationsOutput,
	});

	// cleanup
	await copy(tempOutput, output);
	await copy(tempMigrations, migrationsOutput);
	if (!debug) {
		await rm(tempLayer);
	}

	if (migrationCreated) {
		const openResult = await confirm({
			message: `A new migration was created for your schema changes. Open it in VS Code now?`,
			active: `Yes`,
			inactive: `No`,
		});
		if (!isCancel(openResult) && openResult) {
			const migrationFile = path.resolve(
				migrationsOutput,
				`./v${newSchemaVersion}.ts`,
			);
			openInCode(migrationFile);
		}
	}

	outro('🌿 Done!');
}
