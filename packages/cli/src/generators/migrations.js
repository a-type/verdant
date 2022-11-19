import * as path from 'path';

export function createMigration(
	version,
	historyDirectory,
	migrationsDirectory,
	collectionNames,
) {
	let relativePathToHistory = path.relative(
		migrationsDirectory,
		historyDirectory,
	);
	// normalize for Windows paths
	relativePathToHistory = relativePathToHistory.split(path.sep).join('/');

	if (version === 1) {
		return `import v${version}Schema from '${relativePathToHistory}/v${version}.js';
		import { createDefaultMigration } from '@lo-fi/web';

		// this is your first migration, so no logic is necessary!
		export default createDefaultMigration(v${version}Schema);
		`;
	}

	return `import v${version - 1}Schema from '${relativePathToHistory}/v${
		version - 1
	}.js';
  import v${version}Schema from '${relativePathToHistory}/v${version}.js';
  import { migrate } from '@lo-fi/web';

  export default migrate(v${
		version - 1
	}Schema, v${version}Schema, async ({ migrate, withDefaults }) => {
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

export function createMigrationIndex(migrationsDirectory, migrationNames) {
	return `import { Migration } from '@lo-fi/web';

  ${migrationNames
		.map((name) => `import ${name} from './${name}.js';`)
		.join('\n')}

  export default [
    ${migrationNames.join(',')}
  ];
  `;
}
