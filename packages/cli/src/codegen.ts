import { makeDir } from './fs/makedir.js';
import { readSchema } from './readSchema.js';
import { writeSchemaTypings } from './typings.js';

export async function codegen({
	schema,
	output,
}: {
	schema: string;
	output: string;
}) {
	await makeDir(output);
	const parsed = await readSchema({ path: schema });
	await writeSchemaTypings({ schema: parsed, output });
}
