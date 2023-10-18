#!/usr/bin/env node

import swc from '@swc/core';
import * as path from 'path';
import * as fs from 'fs/promises';
import prettier from 'prettier';
import * as changeCase from 'change-case';
import {
	getAllCollectionDefinitions,
	getCollectionTypings,
} from '../src/generators/collections.js';
import {
	clientImplementation,
	clientPackage,
	reactImplementation,
} from '../src/generators/constants.js';
import {
	getClientImplementation,
	getClientTypings,
} from '../src/generators/client.js';
import { emptyDirectory } from '../src/fs/emptyDirectory.js';
import {
	getReactImplementation,
	getReactTypings,
} from '../src/generators/react.js';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import {
	getSchemaVersion,
	schemasDiffer,
	getSchemaIsWIP,
} from '../src/readers/schemaInfo.js';
import {
	createMigration,
	createMigrationIndex,
} from '../src/generators/migrations.js';
import { fileExists } from '../src/fs/exists.js';
import { getObjectProperty } from '../src/generators/tools.js';
import { createDirectory } from '../src/fs/createDirectory.js';
import {
	intro,
	outro,
	spinner,
	text,
	confirm,
	select,
	isCancel,
} from '@clack/prompts';
import {
	setWipFlagOnSchemaString,
	writeSchemaVersion,
} from '../src/mutators/schema.js';
import { execSync } from 'child_process';

const v = yargs(hideBin(process.argv))
	.option('schema', {
		alias: 's',
		type: 'string',
		description: 'Path to schema file',
	})
	.option('output', {
		alias: 'o',
		type: 'string',
		description: 'Path to output directory',
	})
	.option('migrations', {
		alias: 'm',
		type: 'string',
		description:
			'Path to migrations directory. Default is adjacent to output directory.',
	})
	.option('react', {
		alias: 'r',
		type: 'boolean',
		description: 'Include react hooks',
	})
	.option('debug', {
		alias: 'd',
		type: 'boolean',
		description: 'Include debug output for submitting bug reports',
	})
	.option('force', {
		alias: 'f',
		type: 'boolean',
		description:
			'Ignore a mismatch between the input schema and a saved historical schema of the same version.',
	})
	.option('commonjs', {
		alias: 'c',
		type: 'boolean',
		description:
			"Disables file extensions on module imports for environments that don't support them.",
	})
	.option('wip', {
		alias: 'w',
		type: 'boolean',
		description:
			'Generate a client from a work-in-progress schema. This allows iterating on schema changes without having to use --force.',
	})
	.demandOption(['schema', 'output']).argv;

function log(...messages) {
	console.log('│ ');
	console.log('│ ', ...messages);
}

run(v)
	.then(() => {
		process.exit(0);
	})
	.catch(async (err) => {
		console.error(err);
		let someRollbacksFailed = false;
		await Promise.all(
			rollbacks.map((r) =>
				r().catch(() => {
					someRollbacksFailed = true;
				}),
			),
		);
		if (someRollbacksFailed) {
			console.warn(
				'Some rollbacks failed. You may need to manually clean up files or schema version changes.',
			);
		}
		process.exit(1);
	});

const rollbacks = [];

async function run({
	schema: input,
	output,
	react: includeReact,
	debug,
	migrations,
	force,
	commonjs,
}) {
	intro('🌿 Verdant CLI');
	const schemaInputFilePath = path.resolve(process.cwd(), input);
	const compiledSchemaPath = path.resolve(output, 'schema.js');

	// get the input file as the first argument and output as second
	const outputDirectory = path.resolve(process.cwd(), output);
	await createDirectory(outputDirectory);

	const result = await swc.parseFile(schemaInputFilePath, {
		syntax: 'typescript',
	});

	// dropping this in a temp file is useful for debugging
	if (debug) {
		const tempTranspiledOutput = path.resolve(
			outputDirectory,
			'schema-temp.json',
		);
		await fs.writeFile(
			tempTranspiledOutput,
			prettier.format(JSON.stringify(result.body), {
				parser: 'json',
			}),
		);
	}

	// get the schema version. if a historical schema already exists with this version,
	// compare their files and throw an error if they are different - a migration is
	// required.
	// otherwise, write this historical schema to the output directory
	const version = getSchemaVersion(result.body);
	const historicalSchemasDirectory = path.resolve(
		outputDirectory,
		'./schemaVersions',
	);
	// let: this might be overwritten later if version is bumped
	// FIXME: clean up that logic so this can be immutable?
	let historicalSchemaPath = path.resolve(
		historicalSchemasDirectory,
		`./v${version}.ts`,
	);

	/** The import path for getting the canonical schema from a client definition. */
	const relativeSchemaPath = commonjs ? './schema' : './schema.js';

	await createDirectory(historicalSchemasDirectory);

	const collections = getAllCollectionDefinitions(result.body);
	const collectionNames = Object.keys(collections);

	const migrationsDirectory = migrations
		? path.resolve(process.cwd(), migrations)
		: path.resolve(outputDirectory, '../migrations');

	await createDirectory(migrationsDirectory);

	const historicalSchemaExists = await fileExists(historicalSchemaPath);
	const conflictWithHistorical =
		!historicalSchemaExists ||
		(await schemasDiffer(historicalSchemaPath, schemaInputFilePath));
	const compiledSchemaExists = await fileExists(compiledSchemaPath);
	const conflictWithCanonical =
		!compiledSchemaExists ||
		(await schemasDiffer(compiledSchemaPath, schemaInputFilePath));

	let canonicalSchemaIsWIP = false;
	let canonicalSchemaVersion = 0;
	if (historicalSchemaExists) {
		const compiledSchemaParsed = await swc.parseFile(compiledSchemaPath);
		canonicalSchemaIsWIP = getSchemaIsWIP(compiledSchemaParsed.body);
		canonicalSchemaVersion = getSchemaVersion(compiledSchemaParsed.body);
	}

	if (conflictWithHistorical || canonicalSchemaIsWIP) {
		let selection;
		let newSchemaVersion = version;
		let migrationCreated = false;
		if (!historicalSchemaExists) {
			selection = await select({
				message: `New schema version: ${version}. Choose a way to proceed:`,
				options: [
					{
						value: 'wip',
						label: `🏗️  Start a new WIP schema for version ${version + 1}`,
					},
					{
						value: 'publish',
						label: `📦 Publish a new production schema for version ${
							version + 1
						}`,
					},
					{ value: 'exit', label: '🚪 Exit (do nothing)' },
				],
			});
		} else if (canonicalSchemaIsWIP) {
			selection = await select({
				message: `A WIP schema for version ${version} already exists. Choose a way to proceed:`,
				options: [
					{ value: 'wip', label: `🏗️  Refresh current WIP version ${version}` },
					{
						value: 'publish',
						label: `📦 Publish the production schema for version ${version}`,
					},
					{ value: 'exit', label: '🚪 Exit (do nothing)' },
				],
			});
		} else {
			selection = await select({
				message: `Schema version ${version} already exists and the schemas are different. Choose a way to proceed:`,
				options: [
					{
						value: 'wip',
						label: `🏗️  Start a new WIP schema for version ${version + 1}`,
					},
					{
						value: 'publish',
						label: `📦 Publish a new production schema for version ${
							version + 1
						}`,
					},
					{ value: 'exit', label: '🚪 Exit (do nothing)' },
					{
						value: 'force',
						label: `⚠️  Overwrite production schema for version ${version}`,
					},
				],
			});
		}

		if (isCancel(selection)) {
			outro('Bye!');
			process.exit(0);
		}

		if (selection === 'exit') {
			outro('Bye!');
			process.exit(0);
		}

		if (selection === 'force') {
			const confirmOverwrite = await confirm({
				message: `Are you sure you want to overwrite version ${version}? ⛔ If you already deployed this version, user data will get corrupted. ⛔`,
				active: `I have not deployed version ${version} yet`,
				inactive: `I have already deployed version ${version}`,
			});
			if (isCancel(confirmOverwrite)) {
				outro('Bye!');
				process.exit(0);
			}
			if (!confirmOverwrite) {
				outro(
					`ℹ️ Run the command again and select either "Start a new WIP version" or "Publish a new version" to start version ${
						version + 1
					}. If you really want to override version ${version}, you will have to lie to me.`,
				);
				process.exit(0);
			}
		} else if (historicalSchemaExists && !canonicalSchemaIsWIP) {
			newSchemaVersion = version + 1;
			log(`🆙  Bumping your schema to v${newSchemaVersion}...`);
			await writeSchemaVersion(schemaInputFilePath, newSchemaVersion);
			historicalSchemaPath = path.resolve(
				historicalSchemasDirectory,
				`./v${newSchemaVersion}.ts`,
			);
			rollbacks.push(async () => {
				await writeSchemaVersion(schemaInputFilePath, version);
			});
			migrationCreated = await upsertMigration({
				version: newSchemaVersion,
				historicalSchemasDirectory,
				migrationsDirectory,
				collectionNames,
				commonjs,
			});
		} else {
			migrationCreated = await upsertMigration({
				version,
				historicalSchemasDirectory,
				migrationsDirectory,
				collectionNames,
				commonjs,
			});
		}

		// all other logic is the same, except WIP sets the WIP flag.
		await writeClient({
			output: outputDirectory,
			collections,
			relativeSchemaPath,
			commonjs,
		});

		if (includeReact) {
			await writeReact({
				output: outputDirectory,
				collections,
				relativeSchemaPath,
				commonjs,
			});
		}

		await copyToHistoricalSchema({
			schemaInputFilePath,
			historicalSchemaPath,
		});
		// write canonical schema last, in case something happens...
		// TODO: better error handling
		await writeCanonicalSchema({
			output: outputDirectory,
			input,
			commonjs,
			wip: selection === 'wip',
			path: compiledSchemaPath,
		});

		log(
			`✨ Applied new${
				selection === 'wip' ? ' WIP' : ''
			} schema: version ${newSchemaVersion}`,
		);

		if (migrationCreated) {
			const openResult = await confirm({
				message: `A new migration was created for your schema changes. Open it in VS Code now?`,
				active: `Yes`,
				inactive: `No`,
			});
			if (!isCancel(openResult) && openResult) {
				const migrationFile = path.resolve(
					migrationsDirectory,
					`./v${newSchemaVersion}.ts`,
				);
				try {
					execSync(`code ${migrationFile}`);
				} catch (err) {
					log(
						`💀 Failed to open VS Code. You\'ll have to open the file yourself: ${migrationFile}`,
					);
				}
			}
		}

		outro('🌿 Done!');
	} else {
		// schemas are identical. we just need to refresh generated code.
		const relativeSchemaPath = commonjs ? './schema' : './schema.js';

		await writeClient({
			output: outputDirectory,
			collections,
			relativeSchemaPath,
			commonjs,
		});
		if (includeReact) {
			await writeReact({
				output: outputDirectory,
				collections,
				relativeSchemaPath,
				commonjs,
			});
		}

		outro('✨ No schema changes detected. Refreshed your client code.');
	}
}

/**
 * @param {object} options
 * @param {string} options.output
 * @param {string} options.input
 * @param {boolean} options.commonjs
 * @param {boolean} options.wip
 */
async function writeCanonicalSchema({
	output,
	input,
	commonjs = false,
	wip = false,
	path: compiledSchemaPath,
}) {
	// re-read schema from disk, it may be modified (version bump)
	const schemaModule = await swc.parseFile(input, {
		syntax: 'typescript',
	});

	let compiledSchema = await swc.print(schemaModule, {
		sourceMaps: false,
		jsc: {
			parser: {
				syntax: 'typescript',
				dynamicImport: true,
				decorators: true,
				decoratorsBeforeExport: true,
			},
			loose: true,
			target: 'es2019',
		},
	});

	if (wip) {
		compiledSchema.code = setWipFlagOnSchemaString(compiledSchema.code);
	}

	// load the schema, parse it, and write plain JS to temporary file
	await fs.writeFile(
		compiledSchemaPath,
		prettier.format(compiledSchema.code, {
			parser: 'babel',
		}),
	);

	return {
		compiledSchemaPath: commonjs
			? compiledSchemaPath.replace('.js', '')
			: compiledSchemaPath,
	};
}

/**
 * @param {object} options
 * @param {number} options.version
 * @param {string} options.historicalSchemasDirectory
 * @param {string} options.migrationsDirectory
 * @param {string[]} options.collectionNames
 * @param {boolean} options.commonjs
 */
async function upsertMigration({
	version,
	historicalSchemasDirectory,
	migrationsDirectory,
	collectionNames,
	commonjs,
}) {
	// write a migration file if it doesn't already exist.
	const migrationFilePath = path.resolve(
		migrationsDirectory,
		`./v${version}.ts`,
	);
	const migrationExists = await fileExists(migrationFilePath);
	if (!migrationExists) {
		const migration = createMigration({
			version,
			historyDirectory: historicalSchemasDirectory,
			migrationsDirectory,
			collectionNames,
			commonjs,
		});
		await fs.writeFile(
			migrationFilePath,
			prettier.format(migration, {
				parser: 'typescript',
			}),
		);
		rollbacks.push(async () => {
			await fs.unlink(migrationFilePath);
			await updateMigrationIndex({ migrationsDirectory, commonjs });
		});

		await updateMigrationIndex({ migrationsDirectory, commonjs });
	}

	return !migrationExists;
}

async function updateMigrationIndex({ migrationsDirectory, commonjs }) {
	const allMigrationFiles = await fs.readdir(migrationsDirectory);
	const migrationFiles = allMigrationFiles.filter(
		(f) => f.startsWith('v') && f.endsWith('.ts'),
	);
	const migrationFileNames = migrationFiles.map((f) => f.replace('.ts', ''));
	const migrationIndex = createMigrationIndex({
		migrationsDirectory,
		migrationNames: migrationFileNames,
		commonjs,
	});
	await fs.writeFile(
		path.resolve(migrationsDirectory, `./index.ts`),
		prettier.format(migrationIndex, {
			parser: 'typescript',
		}),
	);
}

/**
 * @param {object} options
 * @param {string} options.output
 * @param {object} options.collections
 * @param {string} options.relativeSchemaPath
 * @param {boolean} options.commonjs
 */
async function writeReact({
	output,
	collections,
	relativeSchemaPath,
	commonjs,
}) {
	const reactTypingsFilePath = path.resolve(
		process.cwd(),
		output,
		'react.d.ts',
	);
	await fs.writeFile(
		reactTypingsFilePath,
		prettier.format(
			getReactTypings({ collections: Object.values(collections), commonjs }),
			{
				parser: 'typescript',
			},
		),
	);
	rollbacks.push(async () => {
		await fs.unlink(reactTypingsFilePath);
	});

	const reactImplementationFilePath = path.resolve(
		process.cwd(),
		output,
		'react.js',
	);
	await fs.writeFile(
		reactImplementationFilePath,
		prettier.format(getReactImplementation(relativeSchemaPath), {
			parser: 'babel',
		}),
	);
	rollbacks.push(async () => {
		await fs.unlink(reactImplementationFilePath);
	});
}

/**
 * @param {object} options
 * @param {string} options.output
 * @param {object} options.collections
 * @param {string} options.relativeSchemaPath
 * @param {boolean} options.commonjs
 */
async function writeClient({
	output,
	collections,
	relativeSchemaPath,
	commonjs,
}) {
	let typingsFile = getClientTypings({
		collections: Object.values(collections),
		schemaPath: relativeSchemaPath,
		commonjs,
	});
	for (const [name, definition] of Object.entries(collections)) {
		typingsFile += getCollectionTypings(definition) + '\n';
	}

	const typingsFilePath = path.resolve(process.cwd(), output, 'index.d.ts');
	await fs.writeFile(
		typingsFilePath,
		prettier.format(typingsFile, {
			parser: 'typescript',
		}),
	);
	rollbacks.push(async () => {
		await fs.unlink(typingsFilePath);
	});

	const implementationFilePath = path.resolve(
		process.cwd(),
		output,
		'index.js',
	);
	await fs.writeFile(
		implementationFilePath,
		prettier.format(getClientImplementation(relativeSchemaPath), {
			parser: 'babel',
		}),
	);
	rollbacks.push(async () => {
		await fs.unlink(implementationFilePath);
	});
}

async function copyToHistoricalSchema({
	schemaInputFilePath,
	historicalSchemaPath,
}) {
	await fs.copyFile(schemaInputFilePath, historicalSchemaPath);
	rollbacks.push(async () => {
		await fs.unlink(historicalSchemaPath);
	});
}
