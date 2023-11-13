import path from 'path';
import { fileExists } from './fs/exists.js';
import { readFile, readdir, unlink } from 'fs/promises';
import { writeSchema } from './schema.js';
import { writeTS } from './fs/write.js';
import { isEmpty } from './fs/isEmpty.js';

export async function needsUpgrade({ output }: { output: string }) {
	const metaPath = path.join(output, 'meta.json');
	if (!(await fileExists(metaPath))) {
		return !(await isEmpty(output));
	}
	const meta = JSON.parse(await readFile(metaPath, 'utf8'));
	return meta.verdantCLI !== 1;
}

export async function upgrade({
	output,
	migrations,
	commonjs,
}: {
	output: string;
	migrations: string;
	commonjs?: boolean;
}) {
	// read schemas and write them back
	const schemasDir = path.join(output, 'schemaVersions');
	const schemas = (
		await readdir(schemasDir, {
			withFileTypes: true,
		})
	).filter(
		(file) =>
			file.isFile() &&
			file.name.endsWith('.ts') &&
			!file.name.endsWith('.d.ts'),
	);
	for (const schema of schemas) {
		const schemaPath = path.join(schemasDir, schema.name);
		await writeSchema({
			schemaPath,
			output,
			commonjs,
		});
	}
	await writeSchema({
		schemaPath: path.join(output, 'schema.js'),
		output,
		commonjs,
		canonical: true,
	});
	// rewrite migrations to use createMigration instead
	// of migrate/createDefaultMigration, and import
	// MigrationTypes for schemas and supply them.
	const migrationFiles = (
		await readdir(migrations, {
			withFileTypes: true,
		})
	).filter(
		(file) =>
			file.isFile() && file.name.endsWith('.ts') && file.name !== 'index.ts',
	);
	for (const migration of migrationFiles) {
		const migrationPath = path.join(migrations, migration.name);
		const contents = await readFile(migrationPath, 'utf8');
		let newContents = contents;
		if (migration.name === 'v1.ts') {
			newContents = withNewMigrationImport(withMigrationTypesImports(contents))
				.replace('createDefaultMigration(', 'createMigration<V1Types>(')
				.replace('migrate(v1Schema', 'createMigration<V1Types>(v1Schema');
		} else {
			const [v1, v2] = getMigrationSchemaVersions(contents);
			if (!v1 || !v2) {
				console.error(
					`Migration ${migration.name} upgrade failed: cannot infer schema versions. Please upgrade manually.`,
				);
				continue;
			}
			newContents = withNewMigrationImport(withMigrationTypesImports(contents))
				.replace(
					'createDefaultMigration(',
					`createMigration<V${v1}Types, V${v2}Types>(`,
				)
				.replace(
					`migrate(v${v1}Schema`,
					`migrate<V${v1}Types, V${v2}Types>(v${v1}Schema`,
				);
		}
		await writeTS(migrationPath, newContents);
	}

	// delete old schemaVersions files
	for (const schema of schemas) {
		await unlink(path.join(schemasDir, schema.name));
	}
}

function getMigrationSchemaVersions(contents: string) {
	const matches = contents.match(/import v(\d+)Schema from /g);
	if (!matches) {
		return [];
	}
	return matches
		.map((match) => {
			// extract "v{int}" from match string
			const version = match.match(/v(\d+)Schema/)?.[1];
			if (!version) {
				return '';
			}
			return version;
		})
		.filter(Boolean)
		.map((v) => parseInt(v, 10))
		.sort();
}

function withMigrationTypesImports(contents: string) {
	return contents.replace(
		/import v(\d+)Schema from /g,
		(_, version) =>
			`import v${version}Schema, { MigrationTypes as V${version}Types } from `,
	);
}

function withNewMigrationImport(contents: string) {
	return contents
		.replace('import { migrate }', 'import { createMigration }')
		.replace('import { createDefaultMigration }', 'import { createMigration }');
}
