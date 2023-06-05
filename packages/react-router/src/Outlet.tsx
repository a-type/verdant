import { useContext, useEffect, useMemo } from 'react';
import { RouteLevelContext, RouteLevelProvider } from './context.js';
import { useMatchingRouteForPath } from './hooks.js';

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

	const Component = parent?.route?.component ?? null;

	useEffect(() => {
		if (match?.route?.onVisited) {
			match.route.onVisited(match.params);
		}
	}, [match]);

	const params = useMemo(
		() => ({
			...upstreamParams,
			...parent?.params,
		}),
		[upstreamParams, parent?.params],
	);

	if (Component) {
		return (
			<RouteLevelProvider
				match={match}
				subpath={match?.path ?? subpath}
				params={params}
			>
				<Component />
			</RouteLevelProvider>
		);
	}

	return null;
}
