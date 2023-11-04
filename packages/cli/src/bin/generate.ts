import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { codegen } from '../codegen.js';

const v = yargs(hideBin(process.argv))
	.option('schema', {
		alias: 's',
		type: 'string',
		description: 'Path to schema file',
	})
	.option('output', {
		alias: 'o',
		type: 'string',
		description: 'Path to output directory',
	})
	.demandOption(['schema', 'output']).argv;

run(v)
	.then(() => {
		process.exit(0);
	})
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});

async function run(args: typeof v) {
	const { schema, output } = await args;
	await codegen({ schema, output });
}
