import { ReactNode, useEffect, useMemo } from 'react';
import { RouteLevelProvider } from './context.js';
import { useMatchingRoute } from './hooks.js';
import { RouteMatch } from './types.js';

export function RouterLevel({
	children,
	rootPath,
	parent,
	transitioning,
	params: parentParams,
}: {
	children: ReactNode;
	rootPath: string;
	parent: RouteMatch | null;
	transitioning?: boolean;
	params?: Record<string, string>;
}) {
	const [match, remainingPath] = useMatchingRoute(parent, rootPath);

	useEffect(() => {
		if (match?.route?.onVisited) {
			match.route.onVisited(match.params);
		}
	}, [match]);

	const params = useMemo(
		() => ({
			...parentParams,
			...parent?.params,
		}),
		[parentParams, parent?.params],
	);

	return (
		<RouteLevelProvider
			match={match}
			parent={parent}
			subpath={remainingPath}
			transitioning={!!transitioning}
			params={params}
		>
			{children}
		</RouteLevelProvider>
	);
}
