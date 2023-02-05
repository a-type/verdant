import * as path from 'path';

export function createMigration({
	version,
	historyDirectory,
	migrationsDirectory,
	collectionNames,
	commonjs = false,
}) {
	const fileEnd = commonjs ? '' : '.js';

	let relativePathToHistory = path.relative(
		migrationsDirectory,
		historyDirectory,
	);
	// normalize for Windows paths
	relativePathToHistory = relativePathToHistory.split(path.sep).join('/');

	if (version === 1) {
		return `import v${version}Schema from '${relativePathToHistory}/v${version}${fileEnd}';
		import { migrate } from '@lo-fi/web';

		// this is your first migration, so no logic is necessary!
		export default migrate(v${version}Schema, async ({ mutations }) => {
			// for version 1, there isn't any data to modify, but you can
			// still use mutations to seed initial data here.
		});
		`;
	}

	return `import v${version - 1}Schema from '${relativePathToHistory}/v${
		version - 1
	}${fileEnd}';
  import v${version}Schema from '${relativePathToHistory}/v${version}${fileEnd}';
  import { migrate } from '@lo-fi/web';

  export default migrate(v${
		version - 1
	}Schema, v${version}Schema, async ({ migrate, withDefaults, info }) => {
    // add or modify migration logic here
		// if a line has a type error, that indicates the shape of your models may have changed
		${collectionNames
			.map(
				(name) =>
					`await migrate('${name}', old => withDefaults('${name}', old))`,
			)
			.join('\n')}
  });
  `;
}

export function createMigrationIndex({
	migrationsDirectory,
	migrationNames,
	commonjs = false,
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
