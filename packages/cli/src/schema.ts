import { execSync, exec } from 'child_process';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as pathTools from 'path/posix';
import * as esbuild from 'esbuild';
import { StorageSchema } from '@verdant-web/common';
import { fileExists } from './fs/exists.js';
import path from 'path';
import { compareObjects } from './compare.js';
import { writeTS } from './fs/write.js';
import {
	getInitTypings,
	getMigrationTypings,
	getSnapshotTypings,
} from './typings.js';
import { posixify } from './fs/posixify.js';
import { makeDir } from './fs/makedir.js';

/**
 * Runs a simple Node script which imports the schema and logs
 * the final JSON to stdout, then reads it from stdout and returns it.
 *
 * To run this script we compile the script and schema, bundling all
 * dependencies of the schema. This allows the user to use any
 * dependencies they want in their schema.
 */
export async function readSchema({
	path,
}: {
	path: string;
}): Promise<StorageSchema> {
	const tempDir = await fs.mkdtemp('temp-');
	// convert path relative to cwd to be relative to temp dir
	path = pathTools.relative(tempDir, posixify(path));
	const readFileContent = `import schema from '${path}';console.log(
		JSON.stringify(
			schema,
			// convert all functions to "FUNCTION"
			(key, value) => (typeof value === 'function' ? 'FUNCTION' : value),
		)
	); process.exit(0);`;
	await fs.writeFile(`${tempDir}/readFile.ts`, readFileContent);
	await esbuild.build({
		entryPoints: [`${tempDir}/readFile.ts`],
		bundle: true,
		outdir: tempDir,
		format: 'esm',
		target: 'esnext',
		platform: 'node',
		allowOverwrite: true,
		// makes this work in tests / development
		conditions: ['development'],
		banner: {
			js: `
      import path from 'path';
      import { fileURLToPath } from 'url';
      import { createRequire as topLevelCreateRequire } from 'module';
      const require = topLevelCreateRequire(import.meta.url);
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      `,
		},
	});
	const result = await new Promise<string>((resolve, reject) => {
		exec(`node ${tempDir}/readFile.js`, (err, stdout) => {
			if (err) {
				reject(err);
			}
			resolve(stdout);
		});
	});
	await fs.rm(tempDir, { recursive: true });
	return JSON.parse(result);
}

export async function writeSchema({
	schemaPath: from,
	wip,
	output,
	commonjs,
	canonical = true,
}: {
	schemaPath: string;
	wip?: boolean;
	output: string;
	commonjs?: boolean;
	canonical?: boolean;
}) {
	const parsed = await readSchema({ path: from });
	// creates a copy of all local source code used in the schema
	// as one bundle. this basically snapshots the schema and all
	// code dependencies at a point in time, excluding any external
	// packages.
	// this copy goes in schemaVersions under the version number
	// for this schema.
	await esbuild.build({
		entryPoints: [from],
		bundle: true,
		packages: 'external',
		outfile: path.resolve(output, 'schemaVersions', `v${parsed.version}.js`),
		format: 'esm',
		allowOverwrite: true,
		target: 'esnext',
		platform: 'node',
		banner: {
			js: `/** @generated - do not modify this file. */`,
		},
		// plugins: [SchemaWipPlugin({ wip })],
	});
	// we write typings for the schema alongside it to schemaVersions. this includes
	// a base typing for the schema itself, and typings for snapshots and inits of all
	// models
	await writeTS(
		path.resolve(output, 'schemaVersions', `v${parsed.version}.d.ts`),
		`
import { StorageSchema } from '@verdant-web/common';
declare const schema: StorageSchema;
export default schema;

${Object.values(parsed.collections)
	.map(
		(collection) =>
			`${getSnapshotTypings({ collection })}${getInitTypings({ collection })}`,
	)
	.reduce((a, b) => a + '\n\n' + b, '')}

	${getMigrationTypings({ schema: parsed })}
`,
	);
	if (canonical) {
		// write the canonical schema entry point, which points to this
		// schema and writes WIP value to it.
		const canonicalSchema = `import schema from './schemaVersions/v${
			parsed.version
		}${commonjs ? '' : '.js'}';
	const finalSchema = { wip: ${wip}, ...schema };
	export default finalSchema;`;
		await fs.writeFile(`${output}/schema.js`, canonicalSchema);
		await writeTS(
			`${output}/schema.d.ts`,
			`export * from './schemaVersions/v${parsed.version}${
				commonjs ? '' : '.js'
			}';
			export { default } from './schemaVersions/v${parsed.version}${
				commonjs ? '' : '.js'
			}';`,
		);
	}
}

/**
 * An ESBuild plugin that writes `wip: true/false` to
 * a call to `schema({ ... })` in the schema file
 */
function SchemaWipPlugin({ wip }: { wip?: boolean }) {
	return {
		name: 'schema-wip',
		setup(build: esbuild.PluginBuild) {
			build.onLoad({ filter: /\.ts$/ }, async (args) => {
				const contents = await fs.readFile(args.path, 'utf8');
				// if wip already exists, don't add it again, just update the value
				if (contents.includes('wip:')) {
					const newContents = contents.replace(
						/wip: (true|false)/,
						`wip: ${wip}`,
					);
					return {
						contents: newContents,
						loader: 'ts',
					};
				}
				const newContents = contents.replace(
					/schema\(([\s\S]+?)\)/,
					`schema({ wip: ${wip}, $1 })`,
				);
				return {
					contents: newContents,
					loader: 'ts',
				};
			});
		},
	};
}

export async function bumpUserSchemaVersion({ path }: { path: string }) {
	// just using Regex for this - find `version: <num>` and replace
	// with `version: <num+1>`

	const content = await fs.readFile(path, 'utf8');
	const match = content.match(/version: (\d+)/);
	if (!match) {
		throw new Error('Could not find version in schema');
	}
	const version = parseInt(match[1]);
	const newVersion = version + 1;
	const newContent = content.replace(
		/version: (\d+)/,
		`version: ${newVersion}`,
	);
	await fs.writeFile(path, newContent, 'utf8');

	// automatically undo this if the user exits the CLI with a non-0 code
	process.on('exit', (code) => {
		if (code !== 0) {
			console.info(`Error rollback: Restoring your original schema`);
			fsSync.writeFileSync(path, content, 'utf8');
		}
	});

	return newVersion;
}

export async function doesCanonicalSchemaExist({ output }: { output: string }) {
	return fileExists(path.join(output, 'schema.js'));
}

export async function isCanonicalSchemaWip({ output }: { output: string }) {
	const schema = await readSchema({ path: `${output}/schema.js` });
	return !!schema.wip;
}

export async function getCanonicalSchemaVersion({
	output,
}: {
	output: string;
}) {
	const schema = await readSchema({ path: `${output}/schema.js` });
	return schema.version;
}

export async function compareUserSchemaToCanonical({
	schema,
	output,
}: {
	schema: string;
	output: string;
}): Promise<{
	different: boolean;
	novel: boolean;
	version: number;
	canonicalIsWip: boolean;
}> {
	const userSchema = await readSchema({ path: schema });
	if (!(await doesCanonicalSchemaExist({ output }))) {
		return {
			different: true,
			novel: true,
			version: userSchema.version,
			canonicalIsWip: false,
		};
	}
	const canonicalSchema = await readSchema({ path: `${output}/schema.js` });
	// we compare these objects deeply, but ignoring WIP flag as the user
	// schema will not have this
	return {
		different: !compareObjects(canonicalSchema, userSchema, {
			ignoreKeys: ['wip'],
		}),
		novel: false,
		version: userSchema.version,
		canonicalIsWip: !!canonicalSchema.wip,
	};
}

export async function writeSchemaVersionsIndex({
	output,
	commonjs,
}: {
	output: string;
	commonjs?: boolean;
}) {
	// make it first if it doesn't exist
	await makeDir(`${output}/schemaVersions`);
	const schemaVersions = await fs.readdir(`${output}/schemaVersions`);
	const versions = schemaVersions
		.filter((version) => version.endsWith('.js') && version !== 'index.js')
		.map((version) => parseInt(version.replace('v', '').replace('.js', '')))
		.sort((a, b) => a - b);
	const index = `
/**
 * @generated - do not modify this file.
 */
${versions
	.map(
		(version) =>
			`import v${version} from './v${version}${commonjs ? '' : '.js'}';`,
	)
	.join('\n')}

export default [${versions.map((version) => `v${version}`).join(', ')}]
	`;
	await fs.writeFile(`${output}/schemaVersions/index.js`, index);
	await fs.writeFile(
		`${output}/schemaVersions/index.d.ts`,
		`
	import { StorageSchema } from '@verdant-web/common';
	declare const versions: StorageSchema[];
	export default versions;
	`,
	);
}
