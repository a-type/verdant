import { execSync } from 'child_process';

export function openInCode(path: string) {
	try {
		execSync(`code ${path}`);
	} catch (err) {
		console.log(
			`|\n| 💀 Failed to open VS Code. You\'ll have to open the file yourself: ${path}`,
		);
	}
}
