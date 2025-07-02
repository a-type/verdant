#!/usr/bin/env node

import { confirm, intro, isCancel, outro, spinner, text } from '@clack/prompts';
import { ExecOptions, exec } from 'child_process';
import { cpTpl } from 'cp-tpl';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

intro('create-verdant-app');

// sad to say I cannot really support multiple templates anymore.
// hard to keep things tested and up to date.
const templateName = 'local';

if (isCancel(templateName)) {
	outro('Cancelled');
	process.exit(1);
}

const directory = await text({
	message: 'Where do you want to create your app?',
	placeholder: './my-verdant-app',
	initialValue: '',
	validate: (value) => {
		if (value === '') {
			return 'Please enter a directory';
		}
	},
});

const destinationDir = path.resolve(process.cwd(), directory as string);

const exists = await fs
	.access(destinationDir)
	.then(() => true)
	.catch(() => false);

if (exists) {
	const overwrite = await confirm({
		message: 'This directory already exists. Do you want to overwrite it?',
	});
	if (!overwrite) {
		outro('Cancelled');
		process.exit(1);
	} else {
		const deleteSpinner = spinner();
		deleteSpinner.start('Deleting directory...');
		await fs.rm(destinationDir, { recursive: true });
		deleteSpinner.stop('Directory deleted');
	}
}

const directoryName = path.basename(directory as string);
const name = await text({
	message: 'What is the name of your app?',
	placeholder: directoryName,
	initialValue: directoryName,
	validate: (value) => {
		if (value === '') {
			return 'Please enter a name';
		}
	},
});

const copySpinner = spinner();

copySpinner.start('Copying files...');

const dontCopy = [
	'node_modules/**/*',
	'package-lock.json',
	'yarn.lock',
	'pnpm-lock.yaml',
];

const copyConfig = {
	replace: {
		'{{todo}}': name,
		'.env-template': '.env',
		'.gitignore-template': '.gitignore',
	},
	gitingore: true,
	exclude: dontCopy,
};

await cpTpl(
	path.resolve(__dirname, `../templates/${templateName as string}`),
	destinationDir,
	copyConfig,
);
await cpTpl(
	path.resolve(__dirname, '../templates/common'),
	destinationDir,
	copyConfig,
);

copySpinner.stop('Copying complete');

const installSpinner = spinner();

installSpinner.start('Installing dependencies...');

// exec pnpm i in the new directory
await execAsync('pnpm i', {
	cwd: destinationDir,
});

installSpinner.stop('Dependencies installed');

installSpinner.start('Updating Verdant to latest...');

await execAsync('pnpm --recursive update "@verdant-web/*" --latest', {
	cwd: destinationDir,
});

installSpinner.stop('Verdant updated');

installSpinner.start('Generating client code...');

// exec pnpm generate in the new directory
await execAsync('pnpm generate --select=wip --module=esm', {
	cwd: destinationDir,
});

installSpinner.stop(
	'Your first Verdant schema has been created in WIP mode. You can try out your app immediately! Edit your schema and run `pnpm generate` to generate a new version.',
);

const openInCode = await confirm({
	message: 'Do you want to open the project in VS Code?',
});

if (openInCode) {
	exec(`code ${destinationDir} ${destinationDir}/README.md`);
}

outro('Done!');

async function execAsync(command: string, options?: ExecOptions) {
	return new Promise<void>((resolve, reject) => {
		exec(command, options, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}
