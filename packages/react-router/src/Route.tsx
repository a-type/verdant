import { useEffect, useMemo } from 'react';
import { RouteLevelProvider } from './context.js';
import { RouteMatch } from './types.js';

export interface RouteProps {
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
export function Route({ value, params }: RouteProps) {
	useEffect(() => {
		value?.route.onVisited?.(value.params);
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
		<RouteLevelProvider
			match={value}
			subpath={value.path}
			params={paramsToPass}
		>
			<Component />
		</RouteLevelProvider>
	);
}
