import * as fs from 'fs/promises';

export async function compareFiles(from: string, to: string) {
	const fromContent = await fs.readFile(from, 'utf8');
	const toContent = await fs.readFile(to, 'utf8');
	return fromContent === toContent;
}
