import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { getSchemaIsWIP } from '../src/readers/schemaInfo.js';
import swc from '@swc/core';
import * as path from 'path';

const v = yargs(hideBin(process.argv))
	.option('output', {
		alias: 'o',
		type: 'string',
		description: 'Path to output directory',
	})
	.demandOption(['output']).argv;

run(v)
	.then(() => {
		process.exit(0);
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});

async function run({ output }) {
	// preflight checks to make sure the schema is not WIP
	// before shipping a client

	const schemaLocation = path.resolve(output, 'schema.js');
	const schemaModule = await swc.parseFile(schemaLocation);
	const schemaIsWIP = await getSchemaIsWIP(schemaModule.body);

	if (schemaIsWIP) {
		throw new Error(
			'⛔ Your Verdant schema is WIP and cannot be deployed to users. Run `verdant generate` to upgrade to a production schema before deploying.',
		);
	}

	console.log('✅ Preflight checks passed. Verdant is ready to deploy.');
}
