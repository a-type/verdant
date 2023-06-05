import { useContext, useMemo } from 'react';
import { RouteLevelContext } from './context.js';
import { useMatchingRouteForPath } from './hooks.js';
import { Route } from './Route.js';

export function Outlet() {
	const {
		match: parent,
		subpath,
		params: upstreamParams,
	} = useContext(RouteLevelContext);

	const match = useMatchingRouteForPath(
		subpath,
		parent?.route.children ?? null,
	);

	if (!match) return null;

	return <Route value={match} params={upstreamParams} />;
}
