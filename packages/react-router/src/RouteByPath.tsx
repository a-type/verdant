import { Route } from './Route.js';
import { useLocationPath } from './context.js';
import { useRouteMatchesForPath } from './hooks.js';
import { joinPaths } from './util.js';

export interface RouteByPathProps {
	path: string;
}

export function RouteByPath({ path }: RouteByPathProps) {
	const basePath = useLocationPath();
	const resolvedPath = path.startsWith('/') ? path : joinPaths(basePath, path);
	const matches = useRouteMatchesForPath(resolvedPath);
	const match = matches[matches.length - 1];
	if (!match) return null;
	return <Route value={match} />;
}
