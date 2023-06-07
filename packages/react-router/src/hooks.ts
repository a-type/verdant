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
import {
	getAllMatchingRoutes,
	getBestRouteMatch,
	matchPath,
} from './resolution.js';

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

/**
 * Returns the full list of matching routes for the given path.
 * A path will match exactly one leaf route; this is the traversal
 * from the root to that leaf.
 *
 * The path can be relative to the current location or absolute.
 */
export function useRouteMatchesForPath(fullPath: string): RouteMatch[] {
	const root = useRootMatch();
	const matches = useMemo(
		() => getAllMatchingRoutes(fullPath, '', root?.route.children || []),
		[root, fullPath],
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
	const { match: parent, subpath, params } = useContext(RouteLevelContext);

	const match = useMatchingRouteForPath(
		subpath,
		parent?.route.children ?? null,
	);

	// params must be merged in manually for this hook...
	const matchWithParams = useMemo(
		() => ({
			...match,
			params: {
				...params,
				...match?.params,
			},
		}),
		[match, params],
	);

	if (!match) {
		return null;
	}

	// cast here relies on match being defined
	return matchWithParams as RouteMatch;
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
