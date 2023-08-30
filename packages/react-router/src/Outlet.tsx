import { ReactNode, useContext } from 'react';
import { RouteLevelContext } from './context.js';
import { useMatchingRouteForPath } from './hooks.js';
import { RouteRenderer } from './Route.js';
import { RouteMatch } from './types.js';

export interface OutletProps {
	/**
	 * Supply children to override the default show/hide behavior of the outlet.
	 * You must render a RouteRenderer, passing match and params as props, to
	 * properly show a matched route.
	 */
	children?: (
		match: RouteMatch | null,
		params: Record<string, string> | undefined,
	) => ReactNode;
}

export function Outlet({ children }: OutletProps) {
	const { match: parent, params: upstreamParams } =
		useContext(RouteLevelContext);

	const match = useMatchingRouteForPath(
		parent?.remainingPath ?? '',
		parent?.route.children ?? null,
	);

	if (children) {
		return children(match, upstreamParams);
	}

	if (!match) return null;

	return <RouteRenderer value={match} params={upstreamParams} />;
}
