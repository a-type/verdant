export function joinPaths(path1: string, path2: string | undefined) {
	if (!path2) {
		return path1;
	}
	if (!path1) {
		return path2;
	}
	if (path1.endsWith('/') && path2.startsWith('/')) {
		return path1 + path2.slice(1);
	}
	if (!path1.endsWith('/') && !path2.startsWith('/')) {
		return path1 + '/' + path2;
	}

	return path1 + path2;
}
