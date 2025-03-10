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

export function generateId() {
	return Math.random().toString(36).slice(2, 9);
}

export function removeBasePath(pathname: string, basePath: string | undefined) {
	if (basePath && pathname.startsWith(basePath)) {
		return pathname.slice(basePath.length);
	}
	return pathname;
}
