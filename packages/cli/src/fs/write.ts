import * as fs from 'fs/promises';
import prettier from 'prettier';
import { transform } from 'esbuild';

export async function writeTS(path: string, source: string) {
	return fs.writeFile(
		path,
		await prettier.format(source, { parser: 'typescript' }),
	);
}

export async function writeTSAsJS(
	path: string,
	source: string,
	commonjs = false,
) {
	// compile the TS source to JS and write it
	const compiled = await transform(source, {
		loader: 'ts',
		format: commonjs ? 'cjs' : 'esm',
	});
	return fs.writeFile(
		path,
		await prettier.format(compiled.code, { parser: 'babel' }),
	);
}
