import * as fs from 'fs/promises';
import prettier from 'prettier';

export async function writeTS(path: string, source: string) {
  return fs.writeFile(path, await prettier.format(source, { parser: 'typescript' }));
}
