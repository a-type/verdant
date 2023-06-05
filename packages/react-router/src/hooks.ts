import {
	useCallback,
	useContext,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { IndexRouteConfig, RouteConfig, RouteMatch } from './types.js';
import { pathToRegexp, Key } from 'path-to-regexp';
import { RouteLevelContext, useRootMatch, useLocationPath } from './context.js';
import { joinPaths } from './util.js';

function useStableCallback<T extends Function>(cb: T): T {
	const ref = useRef(cb);
	ref.current = cb;
	return useCallback((...args: any[]) => ref.current(...args), []) as any as T;
}

export function useOnLocationChange(
	callback: (
		location: Location,
		state: {
			state?: any;
			skipTransition?: boolean;
		},
	) => void,
) {
	const cb = useStableCallback(callback);
	useLayoutEffect(() => {
		const handler = (ev: PopStateEvent) => cb(location, ev.state || {});
		window.addEventListener('popstate', handler);
		return () => window.removeEventListener('popstate', handler);
	}, [cb]);
}

function isIndexRoute(route: RouteConfig): route is IndexRouteConfig {
	return (route as any).index === true;
}

function getRoutePath(route: RouteConfig): { path: string; exact: boolean } {
	if (isIndexRoute(route)) {
		return { path: '', exact: true };
	}
	if (route.path === '*') {
		return { path: '', exact: false };
	}
	return { path: route.path, exact: !!route.exact };
}

function matchPath(
	fullPath: string,
	basePath: string,
	route: RouteConfig,
): RouteMatch | null {
	const keys: Key[] = [];
	const { path, exact } = getRoutePath(route);
	const re = pathToRegexp(joinPaths(basePath, path), keys, { end: !!exact });
	const match = re.exec(fullPath);
	if (!match) {
		return null;
	}
	const params = keys.reduce((params, key, index) => {
		params[key.name] = match[index + 1];
		return params;
	}, {} as Record<string, string>);
	return { path: match[0], params, route };
}

function getBestRouteMatch(
	fullPath: string,
	basePath: string,
	routes: RouteConfig[],
): RouteMatch | null {
	for (const route of routes) {
		const match = matchPath(fullPath, basePath, route);
		if (match) {
			return match;
		}
	}
	return null;
}

const EMPTY_ROUTES: RouteConfig[] = [];

export function useMatchingRouteForPath(
	basePath: string,
	routes: RouteConfig[] | null,
) {
	const fullPath = useLocationPath();
	const match = useMemo(
		() => getBestRouteMatch(fullPath, basePath, routes || EMPTY_ROUTES),
		[routes, basePath, fullPath],
	);

	return match;
}

function getAllMatchingRoutes(
	fullPath: string,
	basePath: string,
	routes: RouteConfig[],
): RouteMatch[] {
	const match = getBestRouteMatch(fullPath, basePath, routes);
	if (!match) {
		return [];
	}

	const childRoutes = match.route.children;
	if (!childRoutes) {
		return [match];
	}

	return [match].concat(
		getAllMatchingRoutes(
			fullPath,
			joinPaths(basePath, match.path),
			childRoutes,
		),
	);
}

/**
 * Returns the full list of matching routes for the given path.
 * A path will match exactly one leaf route; this is the traversal
 * from the root to that leaf.
 */
export function useRouteMatchesForPath(fullPath: string): RouteMatch[] {
	const root = useRootMatch();
	const { subpath: basePath } = useContext(RouteLevelContext);

	const matches = useMemo(
		() => getAllMatchingRoutes(fullPath, basePath, root?.route.children || []),
		[root, fullPath, basePath],
	);
	return matches;
}

export function useMatchingRoutes(): RouteMatch[] {
	const fullPath = useLocationPath();
	return useRouteMatchesForPath(fullPath);
}

export function useMatchingRoute(): RouteMatch | null {
	const { match } = useContext(RouteLevelContext);
	return match;
}

export function useNextMatchingRoute(): RouteMatch | null {
	const {
		match: parent,
		subpath,
		params: upstreamParams,
	} = useContext(RouteLevelContext);

	const match = useMatchingRouteForPath(
		subpath,
		parent?.route.children ?? null,
	);

	if (!match) {
		return null;
	}
	return match;
}

export function useNavigate() {
	return useCallback(
		(
			to: string,
			{
				replace,
				skipTransition,
				state = null,
			}: { replace?: boolean; skipTransition?: boolean; state?: any } = {},
		) => {
			if (replace) {
				window.history.replaceState(
					{
						state,
						skipTransition,
					},
					'',
					to,
				);
			} else {
				window.history.pushState(
					{
						state,
						skipTransition,
					},
					'',
					to,
				);
			}
			window.dispatchEvent(
				new PopStateEvent('popstate', {
					state: {
						state,
						skipTransition,
					},
				}),
			);
		},
		[],
	);
}

export function useMatch({ path, end }: { path: string; end?: boolean }) {
	const locationPath = useLocationPath();
	const { subpath: basePath } = useContext(RouteLevelContext);
	return useMemo(
		() =>
			matchPath(locationPath, basePath, { path, exact: end, component: Null }),
		[locationPath, path, end],
	);
}

const Null = () => null;

export function useSearchParams() {
	const [params, internalSetParams] = useState(
		new URLSearchParams(location.search),
	);
	useOnLocationChange(() =>
		internalSetParams(new URLSearchParams(location.search)),
	);
	const setParams = useCallback(
		(params: URLSearchParams | ((old: URLSearchParams) => URLSearchParams)) => {
			const newParams =
				typeof params === 'function'
					? params(new URLSearchParams(location.search))
					: new URLSearchParams(params);
			const newSearch = newParams.toString();
			if (newSearch !== location.search) {
				window.history.pushState(null, '', `?${newSearch}`);
				window.dispatchEvent(new PopStateEvent('popstate'));
				internalSetParams(newParams);
			}
		},
		[internalSetParams],
	);
	return [params, setParams] as const;
}
