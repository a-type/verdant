import swc from '@swc/core';
import * as path from 'path';
import * as fs from 'fs/promises';
import prettier from 'prettier';
import * as changeCase from 'change-case';
import {
	getAllCollectionDefinitions,
	getCollectionTypings,
} from '../src/generators/collections.js';
import {
	clientImplementation,
	clientPackage,
	reactImplementation,
	typingsPreamble,
} from '../src/generators/constants.js';
import { getClientTypings } from '../src/generators/client.js';
import { emptyDirectory } from '../src/fs/emptyDirectory.js';
import { getReactTypings } from '../src/generators/react.js';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

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
	.option('react', {
		alias: 'r',
		type: 'boolean',
		description: 'Include react hooks',
	})
	.demandOption(['schema', 'output']).argv;

run(v.schema, v.output, v.react)
	.then(() => {
		console.log('✅ Generated lo-fi code');
		process.exit(0);
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});

async function run(input, output, includeReact) {
	// get the input file as the first argument and output as second
	const outputDirectory = path.resolve(process.cwd(), output);
	try {
		await fs.mkdir(outputDirectory, { recursive: true });
	} catch (e) {
		console.error(e);
	}

	await emptyDirectory(outputDirectory);

	// load the schema, parse it, and write plain JS to temporary file
	const tempTranspiledOutput = path.resolve(
		outputDirectory,
		'schema-temp.json',
	);
	const result = await swc.parseFile(path.resolve(process.cwd(), input), {});
	await fs.writeFile(
		tempTranspiledOutput,
		prettier.format(JSON.stringify(result.body), {
			parser: 'json',
		}),
	);

	const collections = getAllCollectionDefinitions(result.body);

	let typingsFile = typingsPreamble;
	for (const [name, definition] of Object.entries(collections)) {
		typingsFile += getCollectionTypings(name, definition);
	}

	typingsFile += getClientTypings(Object.keys(collections));

	const typingsFilePath = path.resolve(process.cwd(), output, 'index.d.ts');
	await fs.writeFile(
		typingsFilePath,
		prettier.format(typingsFile, {
			parser: 'typescript',
		}),
	);

	const implementationFilePath = path.resolve(
		process.cwd(),
		output,
		'index.js',
	);
	await fs.writeFile(
		implementationFilePath,
		prettier.format(clientImplementation, {
			parser: 'babel',
		}),
	);

	const reactTypingsFilePath = path.resolve(
		process.cwd(),
		output,
		'react.d.ts',
	);
	await fs.writeFile(
		reactTypingsFilePath,
		prettier.format(getReactTypings(Object.values(collections)), {
			parser: 'typescript',
		}),
	);

	const reactImplementationFilePath = path.resolve(
		process.cwd(),
		output,
		'react.js',
	);
	await fs.writeFile(
		reactImplementationFilePath,
		prettier.format(reactImplementation, {
			parser: 'babel',
		}),
	);

	const packageFilePath = path.resolve(process.cwd(), output, 'package.json');
	await fs.writeFile(
		packageFilePath,
		prettier.format(clientPackage, {
			parser: 'json',
		}),
	);

	await fs.unlink(tempTranspiledOutput);
}
