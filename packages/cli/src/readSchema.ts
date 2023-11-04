import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as pathTools from 'path/posix';
import * as esbuild from 'esbuild';
import { StorageSchema } from '@verdant-web/common';

/**
 * Runs a simple Node script which imports the schema and logs
 * the final JSON to stdout, then reads it from stdout and returns it.
 *
 * To run this script we compile the script and schema, bundling all
 * dependencies of the schema. This allows the user to use any
 * dependencies they want in their schema.
 */
export async function readSchema({
	path,
}: {
	path: string;
}): Promise<StorageSchema> {
	const tempDir = await fs.mkdtemp('temp-');
	// convert path relative to cwd to be relative to temp dir
	path = pathTools.relative(tempDir, path);
	const readFileContent = `import schema from '${path}';console.log(JSON.stringify(schema))`;
	await fs.writeFile(`${tempDir}/readFile.ts`, readFileContent);
	await esbuild.build({
		entryPoints: [`${tempDir}/readFile.ts`],
		bundle: true,
		outdir: tempDir,
		format: 'esm',
		target: 'esnext',
		platform: 'node',
		banner: {
			js: `
      import path from 'path';
      import { fileURLToPath } from 'url';
      import { createRequire as topLevelCreateRequire } from 'module';
      const require = topLevelCreateRequire(import.meta.url);
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      `,
		},
	});
	const result = execSync(`node ${tempDir}/readFile.js`).toString();
	await fs.rm(tempDir, { recursive: true });
	return JSON.parse(result);
}
