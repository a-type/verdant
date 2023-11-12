import * as fs from 'fs/promises';
import * as path from 'path';

export async function isCommonJS() {
	// find a package.json from cwd
	const cwd = process.cwd();
	let pkgPath = cwd;
	while (pkgPath !== path.parse(pkgPath).root) {
		try {
			const pkg = JSON.parse(
				await fs.readFile(`${pkgPath}\\package.json`, 'utf8'),
			);
			return pkg.type === 'commonjs' || !pkg.type;
		} catch (err) {
			// ignore
		}
		pkgPath = path.dirname(pkgPath);
	}
	return true;
}
