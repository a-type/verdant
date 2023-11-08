import { isCommonJS } from '../env.js';
import { writeSchema } from '../schema.js';

export async function compileSchema({
	schema,
	output,
}: {
	schema: string;
	output: string;
}) {
	const commonjs = await isCommonJS();
	await writeSchema({
		schemaPath: schema,
		output,
		commonjs,
	});
}
