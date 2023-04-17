import { useContext, useEffect, useMemo } from 'react';
import { RouteLevelContext, RouteLevelProvider } from './context.js';
import { useMatchingRoute } from './hooks.js';

export function Outlet() {
	const {
		match: parent,
		subpath,
		transitioning,
		params: upstreamParams,
	} = useContext(RouteLevelContext);

	const match = useMatchingRoute(subpath, parent?.route.children ?? null);

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
				transitioning={transitioning}
				params={params}
			>
				<Component />
			</RouteLevelProvider>
		);
	}

	return null;
}
