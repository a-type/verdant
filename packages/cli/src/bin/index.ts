import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generate } from './generate.js';
import { preflight } from './preflight.js';
import { compileSchema } from './compileSchema.js';

const v = yargs(hideBin(process.argv))
	.command(
		'$0',
		'Generate client code',
		(yargs) => {
			return yargs
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
				.option('migrations', {
					alias: 'm',
					type: 'string',
					description:
						'Path to migrations directory. Default is adjacent to output directory.',
				})
				.option('react', {
					alias: 'r',
					type: 'boolean',
					description: 'Generate React hooks and typings',
				})
				.option('debug', {
					alias: 'd',
					type: 'boolean',
					description: 'Debug mode - retains temp files',
				})
				.demandOption(['schema', 'output']);
		},
		(argv) => {
			generate(argv)
				.then(() => {
					process.exit(0);
				})
				.catch((err) => {
					console.error(err);
					process.exit(1);
				});
		},
	)
	.command(
		'preflight',
		'Validate your code for deployment',
		(yargs) => {
			return yargs
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
				.option('migrations', {
					alias: 'm',
					type: 'string',
					description:
						'Path to migrations directory. Default is adjacent to output directory.',
				})
				.demandOption(['schema', 'output']);
		},
		(argv) => {
			preflight(argv)
				.then(() => process.exit(0))
				.catch((err) => {
					console.error(err);
					process.exit(1);
				});
		},
	)
	.command(
		'compile-schema',
		false,
		(yargs) => {
			return yargs
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
				.demandOption(['schema', 'output']);
		},
		(argv) => {
			compileSchema(argv)
				.then(() => process.exit(0))
				.catch((err) => {
					console.error(err);
					process.exit(1);
				});
		},
	).argv;
