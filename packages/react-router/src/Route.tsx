import { Outlet } from './Outlet.js';
import { RouteLevelProvider } from './context.js';
import { useRouteMatchesForPath } from './hooks.js';

export interface RouteProps {
	path: string;
}

/**
 * Render a specific route's UI, even if the current URL doesn't
 * match it.
 */
export function Route({ path }: RouteProps) {
	const matches = useRouteMatchesForPath(path);
	const match = matches[matches.length - 1];

	if (!match) return null;

	const Component = match.route.component;

	return (
		<RouteLevelProvider
			match={match}
			subpath={match.path}
			params={match.params}
		>
			<Component />
		</RouteLevelProvider>
	);
}
