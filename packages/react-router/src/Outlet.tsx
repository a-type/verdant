import { useContext } from 'react';
import { RouteLevelContext } from './context.js';
import { useMatchingRouteForPath } from './hooks.js';
import { RouteRenderer } from './Route.js';

export function Outlet() {
	const { match: parent, params: upstreamParams } =
		useContext(RouteLevelContext);

	const match = useMatchingRouteForPath(
		parent?.remainingPath ?? '',
		parent?.route.children ?? null,
	);

	if (!match) return null;

	return <RouteRenderer value={match} params={upstreamParams} />;
}
