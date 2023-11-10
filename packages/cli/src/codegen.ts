import { writeFile } from 'fs/promises';
import { getClientImplementation } from './client.js';
import { writeTS } from './fs/write.js';
import { getReactImplementation, getReactTypings } from './react.js';
import { readSchema } from './schema.js';
import { getAllTypings } from './typings.js';
import path from 'path';

export async function generateClientCode({
	schema,
	output,
	react,
	commonjs,
}: {
	schema: string;
	output: string;
	react?: boolean;
	commonjs?: boolean;
	relativeMigrationsPath?: string;
}) {
	const parsed = await readSchema({ path: schema });
	const indexTypings = getAllTypings({ schema: parsed });
	await writeTS(path.join(output, `/index.d.ts`), indexTypings);
	const indexImplementation = getClientImplementation({
		schemaPath: './schema',
		commonjs,
	});
	await writeTS(path.join(output, `/index.js`), indexImplementation);
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
