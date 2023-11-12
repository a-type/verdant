import * as pathTools from 'path';

export function posixify(path: string) {
	return path.replaceAll(pathTools.win32.sep, pathTools.posix.sep);
}
