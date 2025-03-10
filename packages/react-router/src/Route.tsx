import { memo, useEffect, useMemo } from 'react';
import { RouteLevelProvider, useLocationPath } from './context.js';
import { useRouteMatchesForPath } from './hooks.js';
import { RouteMatch } from './types.js';
import { joinPaths } from './util.js';

export interface RouteRendererProps {
	value: RouteMatch;
	/**
	 * Any upstream route parameters to combine with the rendered
	 * route's parameters. This is for passing params from parent
	 * routes through the tree.
	 */
	params?: Record<string, string>;
}

/**
 * Render a specific route's UI, even if the current URL doesn't
 * match it.
 */
export function RouteRenderer({ value, params }: RouteRendererProps) {
	useEffect(() => {
		const ret = value?.route.onVisited?.(value.params);
		if (typeof ret === 'function') {
			return ret;
		} else if (ret instanceof Promise) {
			return async () => {
				const ret2 = await ret;
				if (typeof ret2 === 'function') {
					ret2();
				}
			};
		}
	}, [value]);

	const paramsToPass = useMemo(
		() => ({
			...value.params,
			...params,
		}),
		[value.params, params],
	);

	if (!value?.route.component) return null;

	const Component = value.route.component;

	return (
		<RouteLevelProvider match={value} params={paramsToPass}>
			<MemoizedComponentRenderer Component={Component} />
		</RouteLevelProvider>
	);
}

// idk if this... does anything...
const MemoizedComponentRenderer = memo(function MemoizedComponentRenderer({
	Component,
}: {
	Component: any;
}) {
	return <Component />;
});

export interface RouteProps {
	path: string;
}

/**
 * Renders the leaf-most route that matches the provided path.
 * To render the entire route tree, use RouteTree.
 */
export function Route({ path }: RouteProps) {
	const basePath = useLocationPath();
	const resolvedPath = path.startsWith('/') ? path : joinPaths(basePath, path);
	const matches = useRouteMatchesForPath(resolvedPath);
	const match = matches[matches.length - 1];
	if (!match) return null;
	return <RouteRenderer value={match} />;
}

export interface RouteTreeProps {
	path: string;
	/** Skip a number of routes from the top */
	skip?: number;
}

/**
 * Renders the top-to-bottom route tree matching the provided path.
 */
export function RouteTree({ path, skip = 0 }: RouteTreeProps) {
	const basePath = useLocationPath();
	const resolvedPath = path.startsWith('/') ? path : joinPaths(basePath, path);
	const matches = useRouteMatchesForPath(resolvedPath);
	const match = matches[skip];
	if (!match) return null;
	return <RouteRenderer value={match} />;
}
