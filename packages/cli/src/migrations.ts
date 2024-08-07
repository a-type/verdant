import pathSystem from 'path';
import pathPosix from 'path/posix';
import { writeTSAsJS, writeTS } from './fs/write.js';
import * as fs from 'fs/promises';
import { fileExists } from './fs/exists.js';
import path from 'path';

export async function upsertMigration({
	version,
	migrationsOutput,
	commonjs,
	relativeSchemasPath,
	migrationsDirectory,
	javascript = false,
}: {
	version: number;
	/** Wherever this should emit to (usually a temp dir) */
	migrationsOutput: string;
	commonjs?: boolean;
	relativeSchemasPath: string;
	/** The actual location of existing migrations */
	migrationsDirectory: string;
	javascript?: boolean;
}) {
	const fileName = javascript ? `v${version}.js` : `v${version}.ts`;
	const exists = await fileExists(
		pathSystem.join(migrationsDirectory, fileName),
	);
	if (exists) {
		return false;
	}

	const migration = getMigration({
		version,
		relativeSchemasPath,
		commonjs,
	});
	if (javascript) {
		await writeTSAsJS(
			pathSystem.join(migrationsOutput, fileName),
			migration,
			commonjs,
		);
	} else {
		await writeTS(pathSystem.join(migrationsOutput, fileName), migration);
	}
	const existingMigrations = await fs.readdir(migrationsDirectory, {
		withFileTypes: true,
	});
	const newMigrations = await fs.readdir(migrationsOutput, {
		withFileTypes: true,
	});
	const allMigrations = [...existingMigrations, ...newMigrations];
	const migrationIndex = getMigrationIndex({
		migrationNames: allMigrations
			.filter(
				(file) =>
					file.isFile() &&
					file.name.endsWith('.ts') &&
					file.name !== 'index.ts',
			)
			.map((file) => path.basename(file.name, '.ts')),
		commonjs,
	});
	if (javascript) {
		await writeTSAsJS(
			pathSystem.join(migrationsOutput, 'index.js'),
			migrationIndex,
			commonjs,
		);
	} else {
		await writeTS(
			pathSystem.join(migrationsOutput, 'index.ts'),
			migrationIndex,
		);
	}
	return true;
}

function getMigration({
	version,
	relativeSchemasPath,
	commonjs,
}: {
	version: number;
	relativeSchemasPath: string;
	commonjs?: boolean;
}): string {
	function getSchemaImport(version: number) {
		return `import v${version}Schema, { MigrationTypes as V${version}Types } from '${pathPosix.join(
			relativeSchemasPath,
			`v${version}${fileEnd}`,
		)}';`;
	}

	const fileEnd = commonjs ? '' : '.js';
	if (version === 1) {
		return `${getSchemaImport(1)}
import { createMigration } from '@verdant-web/store';

// this is your first migration, so no logic is necessary! but you can
// include logic here to seed initial data for users
export default createMigration<V1Types>(v1Schema, async ({ mutations }) => {
  // await mutations.post.create({ title: 'Welcome to my app!' });
});
`;
	}

	return `${getSchemaImport(version - 1)}
${getSchemaImport(version)}
import { createMigration } from '@verdant-web/store';

export default createMigration<V${version - 1}Types, V${version}Types>(v${
		version - 1
	}Schema, v${version}Schema, async ({ migrate }) => {
  // add or modify migration logic here. you must provide migrations for
  // any collections that have changed field types or added new non-nullable
  // fields without defaults
  // await migrate('collectionName', async (old) => ({ /* new */ }));
});
`;
}

export function getMigrationIndex({
	migrationNames,
	commonjs = false,
}: {
	migrationNames: string[];
	commonjs?: boolean;
}) {
	return `
  ${migrationNames
		// they should be sorted in ascending numerical order for prettiness
		.sort((a, b) => {
			const aVersion = parseInt(a.replace('v', '').replace('.ts', ''));
			const bVersion = parseInt(b.replace('v', '').replace('.ts', ''));
			return aVersion - bVersion;
		})
		.map((name) => `import ${name} from './${name}${commonjs ? '' : '.js'}';`)
		.join('\n')}

  export default [
    ${migrationNames.join(',')}
  ];
  `;
}
