import { unlink, writeFile } from 'fs/promises';
import { getClientImplementation } from './client.js';
import { writeTS } from './fs/write.js';
import { getReactImplementation, getReactTypings } from './react.js';
import { readSchema } from './schema.js';
import { getAllTypings } from './typings.js';
import path from 'path';
import { rmIfExists } from './fs/rm.js';
import { validateSchema } from './validate.js';

export async function generateClientCode({
	schema,
	output,
	react,
	commonjs = false,
	javascript = false,
	relativeMigrationsPath,
}: {
	schema: string;
	output: string;
	react?: boolean;
	commonjs?: boolean;
	relativeMigrationsPath: string;
	javascript?: boolean;
}) {
	const parsed = await readSchema({ path: schema });
	validateSchema(parsed);
	const indexTypings = getAllTypings({ schema: parsed });
	const indexImplementation = getClientImplementation({
		schemaPath: './schema',
		commonjs,
		relativeMigrationsPath,
		javascript,
	});

	// the index needs to be TS for TS projects and JS for JS
	// projects, because it's importing migrations which will
	// be in the appropriate language, and JS can't import TS.
	if (javascript) {
		await writeTS(path.join(output, `/index.js`), indexImplementation);
		await writeTS(path.join(output, 'index.d.ts'), indexTypings);
		// remove any existing .ts index files
		await rmIfExists(path.join(output, 'index.ts'));
	} else {
		await writeTS(path.join(output, `/client.d.ts`), indexTypings);
		await writeTS(
			path.join(output, `/client.js`),
			`export * from '@verdant-web/store';`,
		);
		await writeTS(
			path.join(output, './index.ts'),
			`import { ClientDescriptorOptions } from './client${
				commonjs ? '' : '.js'
			}';
			export * from './client${commonjs ? '' : '.js'}';\n` + indexImplementation,
		);
		// remove any existing .js index files
		await rmIfExists(path.join(output, 'index.js'));
		await rmIfExists(path.join(output, 'index.d.ts'));
	}

	if (react) {
		const reactTypings = getReactTypings({ schema: parsed, commonjs });
		await writeTS(path.join(output, `react.d.ts`), reactTypings);
		const reactImplementation = getReactImplementation({
			schemaPath: './schema',
			commonjs,
		});
		await writeTS(path.join(output, `react.js`), reactImplementation);
	}
	await writeFile(
		path.join(output, 'meta.json'),
		JSON.stringify({
			verdantCLI: 1,
		}),
	);
}
