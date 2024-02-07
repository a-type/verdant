#!/usr/bin/env node

import {
	intro,
	outro,
	spinner,
	text,
	confirm,
	note,
	select,
	isCancel,
} from '@clack/prompts';
import { cpTpl } from 'cp-tpl';
import * as url from 'url';
import * as path from 'path';
import { ExecOptions, exec } from 'child_process';
import * as fs from 'fs/promises';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

intro('create-verdant-app');

const templateName = await select({
	message: 'What template do you want to use?',
	options: [
		{
			value: 'local',
			label:
				'The "local-only"     | A static webpage using Verdant for first-class IndexedDB DX (no sync)',
		},
		{
			value: 'full',
			label:
				'The "small business" | A kitchen sink app with a sync server, Google login, and Stripe subscriptions',
		},
		{
			value: 'grant',
			label:
				"Grant's version | My personal template for apps I make. You might find it interesting but I don't recommend using it yourself.",
		},
	],
});

if (isCancel(templateName)) {
	outro('Cancelled');
	process.exit(1);
}

if (templateName === 'grant') {
	const confirmed = await select({
		message:
			'Just checking - make sure you look over the code and update things like the TOS before deploying.',
		options: [
			{
				value: 'ok',
				label: 'I understand',
			},
			{
				value: 'cancel',
				label: 'Cancel',
			},
		],
	});

	if (confirmed === 'cancel' || isCancel(confirmed)) {
		outro('Cancelled');
		process.exit(1);
	}
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

installSpinner.start('Generating client code...');

// exec pnpm generate in the new directory
await execAsync('pnpm generate --select=wip --module=esm', {
	cwd: destinationDir,
});

installSpinner.stop(
	'Your first Verdant schema has been created in WIP mode. You can try out your app immediately! Edit your schema and run `pnpm generate` to generate a new version.',
);

if (templateName === 'full') {
	note(
		`⚠️ The code is scaffolded, but you've still got a few things to do before getting started. Be sure to read the README!`,
	);
}

const openInCode = await confirm({
	message: 'Do you want to open the project in VS Code?',
});

if (openInCode) {
	await execAsync(`code ${destinationDir} ${destinationDir}/README.md`);
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
