import { Route } from './Route.js';
import { useRouteMatchesForPath } from './hooks.js';

export interface RouteByPathProps {
	path: string;
}

export function RouteByPath({ path }: RouteByPathProps) {
	const matches = useRouteMatchesForPath(path);
	const match = matches[matches.length - 1];
	if (!match) return null;
	return <Route value={match} />;
}
