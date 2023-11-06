import { getClientImplementation } from './client.js';
import { isCommonJS } from './env.js';
import { writeTS } from './fs/write.js';
import { getReactImplementation, getReactTypings } from './react.js';
import { readSchema } from './schema.js';
import { getAllTypings } from './typings.js';

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
}) {
	const parsed = await readSchema({ path: schema });
	const indexTypings = getAllTypings({ schema: parsed });
	await writeTS(`${output}/index.d.ts`, indexTypings);
	const indexImplementation = getClientImplementation({
		schemaPath: './schema',
		commonjs,
	});
	await writeTS(`${output}/index.js`, indexImplementation);
	if (react) {
		const reactTypings = getReactTypings({ schema: parsed, commonjs });
		await writeTS(`${output}/react.d.ts`, reactTypings);
		const reactImplementation = getReactImplementation({
			schemaPath: './schema',
			commonjs,
		});
		await writeTS(`${output}/react.js`, reactImplementation);
	}
}
